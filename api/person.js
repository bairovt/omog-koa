'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const authorize = require('../middleware/authorize');
const Person = require('../models/Person');
const User = require('../models/User');
const Joi = require('joi');


const router = new Router();

/* All persons page */
async function findPersons(ctx) {
  let {
    search
  } = ctx.params;

  let persons = await db.query(
    aql `FOR p IN Persons
          FILTER REGEX_TEST(p.name, ${search}, true) OR
            REGEX_TEST(p.surname, ${search}, true) OR
            REGEX_TEST(p.midname, ${search}, true)
          SORT p.order DESC
          RETURN { _key: p._key, _id: p._id, name: p.name, surname: p.surname, midname: p.midname,
		        gender: p.gender, maidenName: p.maidenName, born: p.born, pic: p.pic, info: p.info,
            addedBy: p.addedBy }`
  ).then(cursor => {
    return cursor.all()
  });
  ctx.body = {
    persons
  };
}

/* Person page */
async function getTree(ctx) {
  let {
    person_key
  } = ctx.params;
  const {
    user
  } = ctx.state;
  const person = await Person.get(person_key);

  // const profile = await person.fetchProfile();
  // profile.commonAncestorKey = await person.getCommonAncestorKey(user._id);
  // /* проверка прав на изменение персоны (добавление, изменение) */
  // profile.editable = await person.checkPermission(user, {
  //   manager: true
  // });
  // let tree = await person.fetchTree();

  /* do stuff in parallel */
  const [profile, commonAncestorKey, editable, tree] = await Promise.all([
    person.fetchProfile(),
    person.getCommonAncestorKey(user._id),
    /* проверка прав на изменение персоны (добавление, изменение) */
    person.checkPermission(user, {
      manager: true
    }),
    person.fetchTree()
  ])
  profile.commonAncestorKey = commonAncestorKey;
  profile.editable = editable;

  ctx.body = {
    profile,
    tree
  };
}

// rewrite
async function getPotentialParentsAndChildren(ctx) {
  let {
    person_key
  } = ctx.params;
  const {
    user
  } = ctx.state;
  const person = await Person.get(person_key);

  // const profile = await person.fetchProfile();
  // profile.commonAncestorKey = await person.getCommonAncestorKey(user._id);
  // /* проверка прав на изменение персоны (добавление, изменение) */
  // profile.editable = await person.checkPermission(user, {
  //   manager: true
  // });
  // let tree = await person.fetchTree();

  // do stuff in parallel
  const [profile, commonAncestorKey, editable, tree] = await Promise.all([
    person.fetchProfile(),
    person.getCommonAncestorKey(user._id),
    // проверка прав на изменение персоны (добавление, изменение)
    person.checkPermission(user, {
      manager: true
    }),
    person.fetchTree()
  ])
  profile.commonAncestorKey = commonAncestorKey;
  profile.editable = editable;

  ctx.body = {
    profile,
    tree
  };
}

async function getProfile(ctx) {
  const {
    person_key
  } = ctx.params;
  const {
    user
  } = ctx.state;
  const person = await Person.get(person_key);
  const profile = await person.fetchProfile();
  profile.editable = await person.checkPermission(user, {
    manager: true
  });
  // todo: profile.allowedActions = ['invite', ...] // permissions matrix
  ctx.body = {
    profile
  }
}

async function getCommonAncestorPath(ctx) {
  const {
    person_key,
    ancestor_key
  } = ctx.params;
  const {
    user
  } = ctx.state;
  const person = await Person.get(person_key);
  const ancestor_id = `Persons/${ancestor_key}`;
  const branches = await person.getCommonAncestorPath(user._id, ancestor_id);
  const path = {
    nodes: [],
    edges: []
  };
  for (let branch of branches) {
    branch.vertices.map(item => {
      path.nodes.push({
        _key: item._key,
        _id: item._id,
        name: item.name,
        surname: item.surname,
        midname: item.midname,
        maidenName: item.maidenName,
        gender: item.gender,
        born: item.born,
        died: item.died,
        addedBy: item.addedBy,
        pic: item.pic,
      })
    });
    branch.edges.map(item => {
      path.edges.push({
        _key: item._key,
        _id: item._id,
        _from: item._from,
        _to: item._to,
        addedBy: item.addedBy,
        adopted: item.adopted,
      })
    });
  }
  ctx.body = {
    path
  }
}

async function createNewPerson(ctx) { //POST
  // todo:bug не показывает ошибки валидации (schema erros: 400 bad request)
  const {
    personData,
    isUser,
    userData
  } = ctx.request.body;
  const person = await Person.create(personData, ctx.state.user._id);
  if (isUser) {
    userData.status = 1;
    await User.create(person._id, userData);
  }
  ctx.body = {
    newPersonKey: person._key
  };
}

async function addPerson(ctx) { //POST
  /** person_key - ключ существующего person, к которому добавляем нового person
   reltype: "father", "mother", "son", "daughter" */
  const {
    person_key,
    reltype
  } = ctx.params;
  const {
    personData,
    relation
  } = ctx.request.body;
  const {
    user
  } = ctx.state;
  const person = await Person.get(person_key); // person к которому добавляем
  /* проверка санкций на добавление родителя или ребенка к персоне
      #1: может добавить ближайший родственник-юзер персоны (самый близкий - сам person)
      #2: ??? тот кто добавил персону (addedBy): person.addedBy === user._id
      #3: manager */
  if (!(await person.checkPermission(user, {
      manager: true
    }))) {
    ctx.throw(403, "Нет санкций на добавление персоны");
  }
  const newPerson = await Person.create(personData, ctx.state.user._id);
  // create child edge
  let fromId = person._id, // reltype: 'son' or 'daughter'
    toId = newPerson._id;
  if (['father', 'mother'].includes(reltype)) { // reverse
    fromId = newPerson._id;
    toId = person._id;
  }
  const edgeData = {
    addedBy: user._id,
  };
  if (relation.adopted) edgeData.adopted = true;
  await Person.createChildEdge(edgeData, fromId, toId);
  ctx.body = {
    newPersonKey: newPerson._key
  };
}

async function updatePerson(ctx) { //POST
  // todo: история изменений
  const {
    person_key
  } = ctx.params;
  const {
    user
  } = ctx.state;
  const person = await Person.get(person_key);

  // проверка санкций
  if (
    !(await person.checkPermission(user, {
      manager: true
    }))
  ) {
    return ctx.throw(403, "Нет санкций на изменение персоны");
  }
  let personData = ctx.request.body.person;
  if (personData.rod instanceof Object) {
    personData.rod = personData.rod._id;
  }
  // todo: fix empty rod
  // todo: handle joi errors
  // todo: email errors
  // todo: fix profile page refresh - empty
  // todo: when rod updated show new value instantly

  let result = Joi.validate(personData, Person.schema, {
    stripUnknown: true
  });
  if (result.error) {
    return ctx.throw(result.error);
    // if (result.error) {
    //   // console.error(result.error.details, result.value);
    //   console.error(result.error);
    //   ctx.status = 400; // todo: доп. инфо ошибок валидации
    //   ctx.body = {
    //     errorMsg: result.error.message
    //   }
  } else {
    let validPersonData = result.value;
    // todo: refactor to updatedAt timestamp and log to history
    validPersonData.updated = {
      by: user._id,
      time: new Date()
    };
    await db.collection('Persons').update(person._id, validPersonData, {
      keepNull: false
    });
    ctx.body = {};
  }
}

async function deletePerson(ctx) { // key
  // todo:? do not realy delete person, mark as deleted instead
  const {
    person_key
  } = ctx.params;
  const user = ctx.state.user;

  const person = await Person.get(person_key);

  if (person._id === user._id) {
    ctx.throw(400, 'Запрещено удалять себя');
  }

  if (person.user && !user.isAdmin()) {
    ctx.throw(400, 'Запрещено удалять пользователя');
  }
  /* todo: санкции удаления персон:
  manager (все)
  user (только тех, кого добавил сам)
  продумать, разрешить ли ближайшему родственнику удалять персону (если добавил не он)
  отображать кнопку Удалить, только если есть санкции удаления
  */

  const nextOfKins = await person.fetchNextOfKins();
  if (nextOfKins.length > 1) {
    ctx.throw(400, 'Запрещено удалять персону с более чем 1 связью');
  }
  const nextOfKin = nextOfKins[0];

  /* проверка санкций */
  if (person.addedBy === user._id || user.isAdmin() || user.hasRoles(['manager'])) {} else ctx.throw(403, 'Нет санкций на удаление персоны');

  /* правильное удаление Person (вершины графа удалять вместе со связями) */
  await Person.delete(person._key);

  if (nextOfKin) {
    ctx.body = {
      redirKey: nextOfKin._key
    };
  } else {
    ctx.body = {
      redirKey: user._key
    }
  }
}

router
  .get('/find/:search', findPersons)
  .post('/create', authorize(['manager']), createNewPerson)
  .get('/profile/:person_key', getProfile)
  .post('/:person_key/add/:reltype', addPerson) // обработка добавления персоны
  .post('/update/:person_key', updatePerson) // обработка изменения персоны
  .get('/:person_key/tree', getTree) // person page, profile page
  .get('/:person_key/common_ancestor_path/:ancestor_key', getCommonAncestorPath) // person page, profile page
  .delete('/:person_key', deletePerson)
  .get('/:person_key/potential_parents_and_children', getPotentialParentsAndChildren); // person page, profile page;

module.exports = router.routes();
