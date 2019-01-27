'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const authorize = require('../middleware/authorize');
const {fetchPersonWithClosest} = require('../lib/fetch-db');
const Person = require('../models/Person');
const User = require('../models/User');
const Joi = require('joi');


const router = new Router();

/* All persons page */
async function findPersons(ctx) {
  let {search} = ctx.params;

  let persons = await db.query(
    aql`FOR p IN Persons
          FILTER REGEX_TEST(p.name, ${search}, true) OR
            REGEX_TEST(p.surname, ${search}, true) OR
            REGEX_TEST(p.midname, ${search}, true)
          SORT p.order DESC
          RETURN { _key: p._key, _id: p._id, name: p.name, surname: p.surname, midname: p.midname,
		        gender: p.gender, maidenName: p.maidenName, born: p.born, pic: p.pic, info: p.info,
            addedBy: p.addedBy }`
    ).then(cursor => {return cursor.all()});
  ctx.body = {persons};
}

/* Person page */
async function getTree(ctx) {
  let {person_key} = ctx.params;
  const {user} = ctx.state;
  const person = await Person.get(person_key);
  const profile = await person.fetchProfile(person._id);
  profile.shortest = await person.getShortest(user._id);
  /* проверка прав на изменение персоны (добавление, изменение) */
  profile.editable = await person.checkPermission(user, {manager: true}); // todoo
  let {predki, potomki, siblings} = await person.fetchTree(profile._id);
  ctx.body = {profile, predki, potomki, siblings}; //gens, gensCount
}

async function getProfile(ctx) {
  const {person_key} = ctx.params;
  const {user} = ctx.state;
  const person = await Person.get(person_key);
  const profile = await person.fetchProfile(person._id);
  profile.editable = await person.checkPermission(user, {manager: true});
  // todo: profile.allowedActions = ['invite', ...] // permissions matrix
  ctx.body = {profile}
}

async function createNewPerson(ctx) { //POST
  // todo:bug не показывает ошибки валидации (schema erros: 400 bad request)
  const {personData, isUser, userData} = ctx.request.body;
  const person = await Person.create(personData, ctx.state.user._id);
  if (isUser) {
    userData.status = 1;
    await User.create(person._id, userData);
  }
  ctx.body = {newPersonKey: person._key};
}

async function addPerson(ctx) { //POST
  /** person_key - ключ существующего person, к которому добавляем нового person
   reltype: "father", "mother", "son", "daughter" */
  const {person_key, reltype} = ctx.params;
  const {personData, relation} = ctx.request.body;
  const {user} = ctx.state;
  const person = await Person.get(person_key);   // person к которому добавляем
  /* проверка санкций на добавление родителя или ребенка к персоне
      #1: может добавить ближайший родственник-юзер персоны (самый близкий - сам person)
      #2: ??? тот кто добавил персону (addedBy): person.addedBy === user._id
      #3: manager */
  if (!(await person.checkPermission(user, {manager: true}))) {
    ctx.throw(403, "Нет санкций на добавление персоны");
  }
  const newPerson = await Person.create(personData, ctx.state.user._id);
  // create child edge
  let fromId = person._id, // reltype: 'son' or 'daughter'
      toId = newPerson._id;
  if ( ['father', 'mother'].includes(reltype) ) { // reverse
    fromId = newPerson._id;
    toId = person._id;
  }
  const edgeData = {
    addedBy: user._id,
  };
  if (relation.adopted) edgeData.adopted = true;
  await Person.createChildEdge(edgeData, fromId, toId);
  ctx.body = {newPersonKey: newPerson._key};
}

async function updatePerson(ctx) { //POST
  // todo: история изменений
  const {person_key} = ctx.params;
  const {user} = ctx.state;
  const person = await Person.get(person_key);

  // проверка санкций
  if ( await person.checkPermission(user, {manager: true}) )
  {
    let result = Joi.validate(ctx.request.body.person, Person.schema, {stripUnknown: true});
    if (result.error) {
      console.log(result.error.details, result.value);
      ctx.status = 400;         // todo: доп. инфо ошибок валидации
      ctx.body = {errorMsg: result.error.message}
    } else {
      let validPersonData = result.value;
      validPersonData.updated = {
        by: user._id,
        time: new Date()
      };
      await db.collection('Persons').update(person._id, validPersonData, {keepNull: false});
      ctx.body = {};
    }
  } else {
    ctx.throw(403, "Нет санкций на изменение персоны")
  }
}

async function deletePerson(ctx) { // key
  // todoo: do not realy delete person, mark as deleted instead
  const key = ctx.params.person_key;
  const user = ctx.state.user;

  /* todo: санкции удаления персон:
  manager (все)
  user (только тех, кого добавил сам)*/

  const personAndClosest = await fetchPersonWithClosest(key); //person to remove

  if (personAndClosest.length > 2) ctx.throw(400, 'Запрещено удалять персону с более чем 1 связью');

  const person = personAndClosest[0];
  const closest = personAndClosest[1];

  if (person._id === user._id) ctx.throw(400, 'Запрещено удалять себя'); // запрет удаления персоны самой себя

  if (person.addedBy === user._id || user.isAdmin() || user.hasRoles(['manager'])) {} // проверка санкций
  else ctx.throw(403, 'Нет санкций на удаление персоны');

  /* правильное удаление Person (вершины графа удалять вместе со связями) */
  const childGraph = db.graph('childGraph');
  const vertexCollection = childGraph.vertexCollection('Persons');
  await vertexCollection.remove(key); // todo: test проверка несуществующего ключа

  if (closest) ctx.body = {redirKey: closest._key};
  else ctx.body = {redirKey: user._key}
}

router
  .get('/find/:search', findPersons)
  .post('/create', authorize(['manager']), createNewPerson)
  .get('/profile/:person_key', getProfile)
  .post('/:person_key/add/:reltype', addPerson)    // обработка добавления персоны
  .post('/update/:person_key', updatePerson)    // обработка изменения персоны
  .get('/:person_key/tree', getTree)    // person page, profile page
  .delete('/:person_key', deletePerson);

module.exports = router.routes();
