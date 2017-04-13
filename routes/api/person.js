'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const md5 = require('md5');
const {procName, procText, getPerson, createChildEdge} = require('utils');
const {hashPassword} = require('utils/password');

const router = new Router();

/* All persons page */
async function getAllPersons(ctx, next) {
  let persons = await db.query(aql`FOR p IN Persons FILTER p.repressed != 1 SORT p.surname RETURN p`)
                        .then(cursor => {return cursor.all()});
  ctx.body = {persons};
}

/* Person page */
async function getAncDes(ctx, next) {
    let {person_key} = ctx.params;
    // let person_id = "Persons/" + person_key;

    //извлечь персону с родом и добавившим
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

    // check existence
    if (person === undefined) ctx.throw(404);

    // находим предков персоны
    let ancestors = await db.query(
        aql`FOR v, e, p
            IN 1..100 INBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edge: e, edges: p.edges}`
        ).then(cursor => cursor.all());

    // находим потомков персоны
    let descendants = await db.query(
        aql`FOR v, e, p
            IN 1..100 OUTBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edge: e, edges: p.edges}`
        ).then(cursor => cursor.all());

    ctx.body = {person, ancestors, descendants }; //gens, gensCount
}

async function createPerson(ctx, reltype=null){ //helper function
  const Persons = db.collection('Persons');
  // todo: Валидация данных из формы
  // todo: проверка имени на спецсимволы!!! (разрешены только буквы и "-")
  // name обязательно, surname и midname - нет
  let {surname, name, midname, lifestory, gender=1, maidenName, email, password, rod} = ctx.request.body;
  surname = procName(surname);
  name = procName(name);
  midname = procName(midname);
  lifestory = procText(lifestory);

  let newPerson = {
    // _key: await personKeyGen(surname, name, midname),
    name, surname, midname, lifestory, rod,
    gender: +gender, // 0 or 1
    created: new Date(),
    addedBy: ctx.state.user._id  //кем добавлен,
  };
  // если жен.
  if (reltype === 'mother' || reltype === 'daughter' ) newPerson.gender = 0; //изменить пол на 0
  if (newPerson.gender === 0) newPerson.maidenName = procText(maidenName); //присвоить девичью фамилию

  if (email && password) {
    newPerson.user = {
      status: 1,
      email: email.trim(), // todo: валидация email, password
      passHash: await hashPassword(password.trim())
    }
  }

  return await Persons.save(newPerson);
}

async function createPersonPost(ctx, next){
  const newPerson = await createPerson(ctx);
  // ctx.redirect(`/person/${newPerson._key}`);
  ctx.body = {newPersonKey: newPerson._key};
}

async function removePerson(ctx, next) { // key
    /* правильное удаление Person (вершины графа удалять вместе со связями) */
  const key = ctx.params.person_key;
  const user = ctx.state.user; // current user
    /* санкции удаления персон:
     moderator (все кроме тех, которых добавил админ)
     manager (только тех, кого добавил сам)
     user (только тех, кого добавил сам)
     */
  const personsCollection = db.collection('Persons');
  const person = await personsCollection.document(key); //person to remove

  // console.log(`person.addedBy: ${person.addedBy}, user._id: ${user._id}`);
//todo: !!! подтверждение удаления
//todo: продумать удалени персоны
//todo: запрет удаления персоны самой себя
  if (person.addedBy === user._id || user.isAdmin() || user.hasRoles(['moderator'])) { // проверка санкций
    // правильное удаление вершины графа
    const childGraph = db.graph('childGraph');
    const vertexCollection = childGraph.vertexCollection('Persons');
    await vertexCollection.remove(key); // todo: test проверка несуществующего ключа
    ctx.body = {message: 'Person removed'};
  } else {
    ctx.throw(403, 'Forbidden');
  }
}

router
    .get('/all', getAllPersons)
    .post('/create', createPersonPost)
    .get('/:person_key/get-anc-des', getAncDes)    // страница человека
    .get('/:person_key/remove', removePerson);
    //.use(authorize(['admin', 'manager']))
    // .get('/:key/add/:rel', addPerson)   // страница добавления человека
    // .post('/:key/add/:rel', addPerson)    // обработка добавления человека
    // .get('/:key/remove', removePerson);


module.exports = router.routes();