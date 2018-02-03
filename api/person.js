'use strict';
const db = require('lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const loGet = require('lodash').get;
const authorize = require('middleware/authorize');
const {fetchPerson, fetchPredkiPotomki, fetchPredkiPotomkiIdUnion, findCommonPredki, findClosestUsers} = require('lib/fetch-db'),
      {createChildEdge, createPerson, createUser, checkPermission} = require('lib/person');
const {personSchema, userSchema} = require('lib/schemas'),
      Joi = require('joi');


const router = new Router();

/* All persons page */
async function getAllPersons(ctx) {
  let persons = await db.query(
    aql`FOR p IN Persons
          FILTER p.repressed != 1
          SORT p.order DESC
          RETURN { _key: p._key, _id: p._id, name: p.name, surname: p.surname, midname: p.midname,
		        gender: p.gender, maidenName: p.maidenName, birthYear: p.birthYear, image: p.image, about: p.about }`
    ).then(cursor => {return cursor.all()});
  ctx.body = {persons};
}

/* Person page */
async function getPredkiPotomki(ctx) {
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
  // проверка прав на изменение персоны (добавление, изменение)
  person.editable = await checkPermission(ctx.state.user, person, {manager: true});
  // находим предков и потомков персоны
  let {predki, potomki} = await fetchPredkiPotomki(person._id);
  ctx.body = {person, predki, potomki}; //gens, gensCount
}

async function newPerson(ctx){ //POST
  // console.log(ctx.request.body)
  // console.log(ctx.request.body.file)
  const {personData, isUser, userData} = ctx.request.body;
  const person = await createPerson(personData, ctx.state.user._id);
  if (isUser) await createUser(person._id, userData);
  ctx.body = {newPersonKey: person._key};
}

async function removePerson(ctx) { // key
  const key = ctx.params.person_key;
  const user = ctx.state.user;
  /*
  todo: санкции удаления персон:
  moderator (все кроме тех, которых добавил админ)
  manager (только тех, кого добавил сам)
  user (только тех, кого добавил сам)
  */
  const person = await fetchPerson(key); //person to remove

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

/*async function getPerson(ctx) {
  // used in update person page
  const person = await fetchPerson(ctx.params.person_key);
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
}*/

async function setRelation(ctx){ // POST
  //todo: запрос на соединение с чужой персоной
  //todo: запрет указания отца/матери, если отец/мать уже есть
  const user = ctx.state.user;
  // only manager can set relation
  if (!user.hasRoles('manager')) ctx.throw(403, 'only manager can set relation');
  let {start_key, end_key, reltype, adopted} = ctx.request.body;
  // проверка № 1
  if (start_key === end_key) ctx.throw(400, 'Нельзя человека указать ребенком самого себя');

  let fromKey = start_key, toKey = end_key; // if reltype: 'child'
  if (reltype === 'parent') { // if reltype is 'parent': reverse direction
    fromKey = end_key;
    toKey = start_key;
  }
  // ключи должны быть реальными, иначе 404
  const fromPerson = await fetchPerson(fromKey);
  const toPerson = await fetchPerson(toKey);

  /* todo: заменить проверки №2 и №3 на полный траверс (!adopted) родственников - нельзя в качестве родного родителя или
      ребенка указать кровного родственника (adopted - можно) */
  // проверка № 2
  let predkiAndPotomki = await fetchPredkiPotomkiIdUnion(fromPerson._id);
  if (predkiAndPotomki.includes(toPerson._id)) ctx.throw(400, 'Нельзя в качестве ребенка указать предка или потомка');
  // проверка № 3
  let commonPredki = await findCommonPredki(fromPerson._id, toPerson._id);
  if (commonPredki.length) ctx.throw(400, 'Нельзя в качестве ребенка указать человека с общим предком');

  // todo: соединение только своих персон (кроме админа и модератора)
  // if (fromPerson.addedBy === user._id && toPerson.addedBy === user._id || // both persons added by user
  //     fromPerson.addedBy === user._id && toPerson._id === user._id || // one person added by user, other is user
  //     fromPerson._id === user._id && toPerson.addedBy === user._id || // one person added by user, other is user
  //     user.isAdmin()) {}
  // else ctx.throw(403, 'Forbidden: to link Persons added by different users');
  const edgeData = {
    addedBy: user._id
  }
  if (adopted) edgeData.adopted = true
  await createChildEdge(edgeData, fromPerson._id, toPerson._id);
  ctx.body = {
    location: '/person/'+start_key
  }
}

async function addPerson(ctx){ //POST
  /** person_key - ключ существующего person, к которому добавляем нового person
   reltype: "father", "mother", "son", "daughter" */
  const {person_key, reltype} = ctx.params;
  const {personData, relation} = ctx.request.body
  const user = ctx.state.user;
  const person = await fetchPerson(person_key);   // person к которому добавляем
  /* проверка санкций на добавление родителя или ребенка к персоне
      #0: можно добавлять к себе: person._id === user._id
      #1: может добавить ближайший родственник-юзер персоны (самый близкий - сам person)
      #2: тот кто добавил персону (addedBy): person.addedBy === user._id
      #3: manager */
  let closestUsers = await findClosestUsers(person._id); // юзеры, которые могут изменять person
  if (person._id === user._id || person.addedBy === user._id ||
      user.hasRoles("manager")|| closestUsers.some(el => user._id === el._id))
  {
    const newPerson = await createPerson(personData, ctx.state.user._id);
    // create child edge
    let fromId = person._id, // reltype: 'son' or 'daughter'
        toId = newPerson._id;
    if ( ['father', 'mother'].includes(reltype) ) { // reverse
      fromId = newPerson._id;
      toId = person._id;
    }
    const edgeData = {
      addedBy: user._id,
    }
    if (relation.adopted) edgeData.adopted = true
    await createChildEdge(edgeData, fromId, toId);
    ctx.body = {newPersonKey: newPerson._key};
  } else {
    ctx.throw(403, "Нет санкций на добавление персоны");
  }
  // todo???: verification: does person already have mother or father
}

async function updatePerson(ctx){ //POST
  // todo: история изменений
  const {person_key} = ctx.params;
  const person = await fetchPerson(person_key);
  const user = ctx.state.user;
  // проверка санкций: Изменять персону может ближайший родственник-юзер персоны (самый близкий - сам person)
  // let closestUsers = await findClosestUsers(person._id); // юзеры, которые могут изменять person
  // if (closestUsers.some(el => user._id === el._id))  // если user является ближайшим родственником-юзером
  if ( await checkPermission(user, person, {manager: true}) )
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
  .post('/create', authorize(['manager']), newPerson)
  // .get('/:person_key/fetch', getPerson)
  .post('/set_relation', setRelation)
  .post('/:person_key/add/:reltype', addPerson)    // обработка добавления персоны
  .patch('/:person_key', updatePerson)    // обработка изменения персоны
  .get('/:person_key/predki-potomki', getPredkiPotomki)    // person page, profile page
  .delete('/:person_key', removePerson);

module.exports = router.routes();
