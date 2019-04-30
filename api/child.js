'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const Person = require('../models/Person');


const router = new Router();

async function setRelation(ctx) { // POST
  //todo: запрос на соединение с чужой персоной
  //todo: запрет указания отца/матери, если отец/мать уже есть
  const user = ctx.state.user;
  // only manager can set relation
  // if (!user.hasRoles('manager')) ctx.throw(403, 'only manager can set relation');
  let {
    from_key,
    to_key,
    adopted
  } = ctx.request.body;

  from_key = from_key.trim();
  to_key = to_key.trim();

  // проверка № 1
  if (from_key === to_key) ctx.throw(400, 'Нельзя человека указать ребенком самого себя');

  // ключи должны быть реальными, иначе 404
  const fromPerson = await Person.get(from_key);
  const toPerson = await Person.get(to_key);

  // соединение только своих персон (кроме модератора)
  if (user.hasRoles('manager') ||
    fromPerson.addedBy === user._id && toPerson.addedBy === user._id || // both persons added by user
    fromPerson.addedBy === user._id && toPerson._id === user._id || // one person added by user, other is user
    fromPerson._id === user._id && toPerson.addedBy === user._id || // one person added by user, other is user
    await fromPerson.checkPermission(user) && await toPerson.checkPermission(user) // both persons editable by user
  ) {} else ctx.throw(403, 'User is not allowed to link these persons');

  /* todo: заменить проверки №2 и №3 на полный траверс (!adopted) родственников - нельзя в качестве родного родителя или
      ребенка указать кровного родственника (adopted - можно) */

  // проверка № 2
  let predkiAndPotomki = await fromPerson.fetchPredkiPotomkiIdUnion();
  if (predkiAndPotomki.includes(toPerson._id)) ctx.throw(400, 'Нельзя в качестве ребенка указать предка или потомка');
  // проверка № 3
  // let commonPredki = await findCommonPredki(fromPerson._id, toPerson._id);
  // if (commonPredki.length) ctx.throw(400, 'Нельзя в качестве ребенка указать человека с общим предком');

  // todo: Переделать удаление связи child на реальное удаление с сохранение записи в истоию куда-нибудь
  // проверка № 4: // случай когда связь существует, но была удалена (свойство del) (ArangoError: unique constraint violated - in index 13524179 of type hash over ["_from","_to"]...)
  const childCollection = db.collection('child');
  const existenEdge = await childCollection.byExample({
    _from: 'Persons/' + from_key,
    _to: 'Persons/' + to_key
  }).then((cursor) => {
    return cursor.next()
  });
  if (existenEdge) {
    let history = existenEdge.history || [];
    history.push({
      del: existenEdge.del
    }); // запись истории
    history.push({
      set: {
        by: user._id,
        time: new Date()
      }
    });
    await childCollection.update(existenEdge._id, {
      del: null,
      history // todo: не учитывется adopted
    });
    return ctx.body = {}
  }

  const edgeData = {
    addedBy: user._id
  };
  if (adopted) edgeData.adopted = true;
  await Person.createChildEdge(edgeData, fromPerson._id, toPerson._id);
  return ctx.body = {}
}

async function deleteChildEdge(ctx) {
  const {
    _key
  } = ctx.params;
  const user = ctx.state.user;

  const childCollection = db.collection('child');
  const edge = await childCollection.document(_key);

  if (edge.addedBy === user._id || user.hasRoles(['manager'])) {} // continue
  else ctx.throw(403, 'нет санкций на удаление связи');

  const now = new Date();
  const parent_id = await db.query(
    aql `FOR e IN child
          FILTER e._key == ${_key}
          UPDATE ${_key} WITH {
            del: {
              by: ${user._id},
              time: ${now}
            }
          } IN child
          RETURN e._from
    `).then(cursor => cursor.next());

  ctx.body = {
    parent_key: parent_id.split('/')[1]
  }
}

router
  .post('/set_relation', setRelation)
  .delete('/:_key', deleteChildEdge);

module.exports = router.routes();
