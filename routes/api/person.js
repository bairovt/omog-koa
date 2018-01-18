'use strict';
const db = require('lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const loGet = require('lodash').get;
const authorize =require('middleware/authorize');
const {getPerson, getAncsAndDescs, getAncsDescsIdUnion, getCommonAncs, findClosestUsers} = require('lib/fetch-db'),
      {createChildEdge, createPerson, createUser} = require('lib/person');
const {personSchema, userSchema} = require('lib/schemas'),
      Joi = require('joi');


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
		      RETURN merge({ _key: p._key, _id: p._id, name: p.name, surname: p.surname, midname: p.midname,
		        gender: p.gender, maidenName: p.maidenName, birthYear: p.birthYear, image: p.image, about: p.about },
            {
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
  const person = await createPerson(personData, ctx.state.user._id);
  if (isUser) await createUser(person._id, userData);
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

  if (person._id === user._id) ctx.throw(400, 'Запрещено удалять себя'); // запрет удаления персоны самой себя
  if (person.addedBy === user._id || user.isAdmin() || user.hasRoles(['moderator'])) { // проверка санкций
    /* правильное удаление Person (вершины графа удалять вместе со связями) */
    const childGraph = db.graph('childGraph');
    const vertexCollection = childGraph.vertexCollection('Persons');
    await vertexCollection.remove(key); // todo: test проверка несуществующего ключа
    ctx.body = {message: 'Person removed'};
  } else {
    ctx.throw(403, 'Нет санкций на удаление персоны');
  }
}

async function fetchPerson(ctx) {
  /* used in update person page */
  const person = await getPerson(ctx.params.person_key);
  ctx.body = {
    person: {
      _key: person._key,
      gender: person.gender,
      name: person.name,
      surname: person.surname,
      midname: person.midname,
      maidenName: person.maidenName,
      birthYear: person.birthYear,
      rod: person.rod,
      lifestory: person.lifestory
    }
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
  const edgeData = {
    addedBy: user._id
  }
  await createChildEdge(edgeData, fromPerson._id, toPerson._id);
  ctx.body = {
    location: '/person/'+start_key
  }
}

async function addPerson(ctx){
  /** person_key, reltype
   person_key - ключ существующего person, к которому добавляем нового person
   reltype: "father", "mother", "son", "daughter" */
  const {person_key: startKey, reltype} = ctx.params;
  const {personData, relation} = ctx.request.body
  // todo: verification № 1: does person already have mother or father
  const startPerson = await getPerson(startKey);
  const user = ctx.state.user;
  // проверка санкций: разрешено добавлять либо к себе, либо к своим addedBy
  // console.log('дб', startPerson._id, user._id);
  if (startPerson.addedBy === user._id || startPerson._id === user._id) {} //continue
  else ctx.throw(403, "Нет санкций на добавление персоны");
  const newPerson = await createPerson(personData, ctx.state.user._id);
  // create child edge
  let fromId = startPerson._id, // reltype: 'son' or 'daughter'
      toId = newPerson._id;
  if ( ['father', 'mother'].includes(reltype) ) { // reverse
    fromId = newPerson._id;
    toId = startPerson._id;
  }
  const edgeData = {
    addedBy: user._id,
  }
  if (relation.adopted) edgeData.adopted = true
  await createChildEdge(edgeData, fromId, toId);
  ctx.body = {newPersonKey: newPerson._key};
}

async function updatePerson(ctx){
  // todo: история изменений
  const {person_key} = ctx.params;
  const person = await getPerson(person_key);
  const user = ctx.state.user;
  // проверка санкций: Изменять персону может ближайший родственник-юзер персоны (самый близкий - сам person)
  // продумать случай, когда ближайший родственник-юзер - не активный пользователь, чтобы была возможность делегировать полномочия другому юзеру
  let closestUsers = await findClosestUsers(person._id); // юзеры, которые могут изменять person
  if (closestUsers.some(el => user._id === el._id))  // если user является ближайшим родственником-юзером
  {
    let result = Joi.validate(ctx.request.body.person, personSchema, {stripUnknown: true});
    if (result.error) {
      console.log(result.error.details, result.value);
      ctx.status = 400;
      ctx.body = {
        message: result.error.message
      }
    } else {
      let validPersonData = result.value;
      validPersonData.updated = new Date();
      await db.collection('Persons').update(person._id, validPersonData);
      ctx.body = {
        message: 'person updated'
      };
    }
  } else {
    ctx.status = 403;
    ctx.body = {
      message: "Нет санкций на изменение персоны"
    };
  }
}

router
  .get('/all', getAllPersons)
  .post('/create', authorize(['manager']), createPersonPost)
  .get('/:person_key/fetch', fetchPerson)
  .post('/link-relation', linkRelationPost)
  .post('/:person_key/add/:reltype', addPerson)    // обработка добавления персоны
  .post('/:person_key/update', updatePerson)    // обработка изменения персоны
  .get('/:person_key/get-anc-des', getAncDes)    // страница человека
  .get('/:person_key/remove', removePerson);

module.exports = router.routes();
