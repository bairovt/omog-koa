'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const authorize =require('middleware/authorize');
const {getPerson, getAncsAndDescs, getAncsDescsIdUnion, getCommonAncs} = require('helpers/fetch-db');
const {createChildEdge, createPerson} = require('helpers/person');

const router = new Router();

/* All persons page */
async function getAllPersons(ctx) {
  let persons = await db.query(aql`FOR p IN Persons FILTER p.repressed != 1 SORT p.surname RETURN p`)
                        .then(cursor => {return cursor.all()});
  ctx.body = {persons};
}

/* Person page */
async function getAncDes(ctx) {
    let {person_key} = ctx.params;
    // извлечь персону с родом и добавившим
    let person = await db.query(aql`
		  FOR p IN Persons
		      FILTER p._key == ${person_key}
		      RETURN merge(p, { 
		          rod: FIRST(FOR rod IN Rods            
		                  FILTER p.rod == rod._id
		                  RETURN {name: rod.name, _key: rod._key}),
		          addedBy: FIRST(FOR added IN Persons
		                      FILTER added._id == p.addedBy
		                      RETURN {name: added.name, surname: added.surname, _key: added._key})
		      })`
    ).then(cursor => cursor.next());
    if (person === undefined) ctx.throw(404, 'person not found');
    // находим предков и потомков персоны
    let {ancestors, descendants} = await getAncsAndDescs(person._id);
    ctx.body = {person, ancestors, descendants }; //gens, gensCount
}

async function createPersonPost(ctx){
  const {personData, isUser, userData} = ctx.request.body;
  const opts = {
    userData: isUser ? userData : false
  };
  const person = await createPerson(personData, ctx.state.user._id, opts);
  ctx.body = {newPersonKey: person._key};
}

async function removePerson(ctx) { // key
  const key = ctx.params.person_key;
  const user = ctx.state.user;
    /* todo: санкции удаления персон:
     moderator (все кроме тех, которых добавил админ)
     manager (только тех, кого добавил сам)
     user (только тех, кого добавил сам)
     */
  const personsCollection = db.collection('Persons');
  const person = await personsCollection.document(key); //person to remove
//todo: !!! подтверждение удаления
//todo: продумать удалени персоны
//todo: запрет удаления персоны самой себя
  if (person.addedBy === user._id || user.isAdmin() || user.hasRoles(['moderator'])) { // проверка санкций
    /* правильное удаление Person (вершины графа удалять вместе со связями) */
    const childGraph = db.graph('childGraph');
    const vertexCollection = childGraph.vertexCollection('Persons');
    await vertexCollection.remove(key); // todo: test проверка несуществующего ключа
    ctx.body = {message: 'Person removed'};
  } else {
    ctx.throw(403, 'Forbidden');
  }
}

async function personGet(ctx) {
  const {name, surname, midname , _key, _id} = await getPerson(ctx.params.person_key);
  ctx.body = {
    person: {name, surname, midname, _key, _id}
  }
}

async function linkRelationPost(ctx){
  //todo: запрос на соединение с чужой персоной
  //todo: запрет указания отца/матери, если отец/мать уже есть
  const user = ctx.state.user;
  let {start_key, end_key, reltype} = ctx.request.body;
  // проверка № 1
  if (start_key === end_key) ctx.throw(400, 'Нельзя человека указать ребенком самого себя');

  let fromKey = start_key, toKey = end_key; // if reltype: 'child'
  if (reltype === 'parent') { // if reltype is 'parent': reverse direction
    fromKey = end_key;
    toKey = start_key;
  }
  // ключи должны быть реальными, иначе 404
  const fromPerson = await getPerson(fromKey);
  const toPerson = await getPerson(toKey);

  // проверка № 2
  let ancsAndDescs = await getAncsDescsIdUnion(fromPerson._id);
  if (ancsAndDescs.includes(toPerson._id)) ctx.throw(400, 'Нельзя в качестве ребенка указать предка или потомка');
  // проверка № 3
  let commonAncs = await getCommonAncs(fromPerson._id, toPerson._id);
  if (commonAncs.length) ctx.throw(400, 'Нельзя в качестве ребенка указать человека с общим предком');


  //соединение только своих персон (кроме админа и модератора)
  if (fromPerson.addedBy === user._id && toPerson.addedBy === user._id || // both persons added by user
      fromPerson.addedBy === user._id && toPerson._id === user._id || // one person added by user, other is user
      fromPerson._id === user._id && toPerson.addedBy === user._id || // one person added by user, other is user
      user.isAdmin()) {}
  else ctx.throw(403, 'Forbidden: to link Persons added by different users');

  await createChildEdge(fromPerson._id, toPerson._id, user._id);
  ctx.body = {
    location: '/person/'+start_key
  }
}

async function addPerson(ctx){
  /** person_key, reltype
   person_key - ключ существующего person, к которому добавляем нового person
   reltype: "father", "mother", "son", "daughter" */
  const {person_key: startKey, reltype} = ctx.params;
  const startPerson = await getPerson(startKey);
  const user = ctx.state.user;
  // проверка санкций: разрешено добавлять либо к себе, либо к своим (addedBy)
  if (startPerson.addedBy === user._id || startPerson._id === user._id) {} //continue
  else ctx.throw(403, "Нет санкций на добавление персоны");
  const newPerson = await createPerson(ctx.request.body.personData, ctx.state.user._id);

  // create parent edge
  let fromId, toId;
  if (reltype === 'father' || reltype === 'mother' ) {
    fromId = newPerson._id;
    toId = startPerson._id;
  } else if (reltype === 'son' || reltype === 'daughter' ) {
    fromId = startPerson._id;
    toId = newPerson._id;
  }
  await createChildEdge(fromId, toId, user._id);

  ctx.body = {newPersonKey: newPerson._key};
}

async function editPersonPost(ctx, next){
  /* startKey, reltype
   key, startKey - ключ существующего person, к которому добавляем нового person
   reltype: "father", "mother", "son", "daughter" */
  const {key} = ctx.params;
  const editPerson = await getPerson(key);
  const user = ctx.state.user;
  // проверка санкций: разрешено изменять либо себя, либо своих (addedBy)
  if (editPerson.addedBy === user._id || editPerson._id === user._id) {} //continue
  else ctx.throw(403, "Нет санкций");
  db.query(aql`FOR p IN Persons FILTER p._key == ${key}
						UPDATE p WITH {}`);
  // const newPerson = await createPerson(ctx, reltype);

  ctx.redirect(`/person/${key}`);
}

router
    .get('/all', getAllPersons)
    .post('/create', authorize(['manager']), createPersonPost)
    // .post('/create', createPersonPost)
    .get('/:person_key/get', personGet)
    .post('/link-relation', linkRelationPost)
    .post('/:person_key/add/:reltype', addPerson)    // обработка добавления персоны
    .get('/:person_key/get-anc-des', getAncDes)    // страница человека
    .get('/:person_key/remove', removePerson);
    //.use(authorize(['admin', 'manager']))
    // .get('/:key/add/:rel', addPerson)   // страница добавления человека
    // .post('/:key/add/:rel', addPerson)    // обработка добавления человека

module.exports = router.routes();