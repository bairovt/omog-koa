'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');

const router = new Router();

async function allRods(ctx, next) {
  let rods = await db.query(aql `FOR rod IN Rods
                                  FILTER rod.type == 'subethnos'
                                  SORT rod.order DESC
                                  RETURN merge(rod,
                                    { subrods: (FOR v IN 1..1 OUTBOUND rod._id subrod
                                      OPTIONS {bfs: true, uniqueVertices: "global"}
                                      RETURN v)                                      
                                    })`).then(cursor => cursor.all());

  ctx.body = {
    rods
  };
}

async function rodGraph(ctx, next) {
  let rods = await db.query(aql `FOR v, e IN 0..20 OUTBOUND 'Rods/buryat' subrod
    OPTIONS {bfs: true, uniqueVertices: "global"}
    RETURN {rod: v, edge: e}`).then(cursor => cursor.all());

  ctx.body = {
    rods
  };
}

async function rodPersons(ctx, next) { //key
  let Rods = db.collection('Rods');
  let key = ctx.params.key;
  let rod = await Rods.document(key);
  let persons = await db.query(aql `FOR p IN Persons
	                                      FILTER p.rod == ${'Rods/'+key}
	                                      RETURN p`).then(cursor => cursor.all());
  ctx.body = {
    rod,
    persons
  };
}

async function addRod(ctx) {
  const rods = db.collection('Rods');
  // todo: валидация, схема
  const {
    rod
  } = ctx.request.body;
  rod.addedBy = ctx.state.user._id;
  rod.addedAt = new Date();
  const result = await rods.save(rod, {
    returnNew: true
  });
  return ctx.body = result.new;
}

router
  .get('/all', allRods) // страница: все рода
  .get('/graph', rodGraph)
  .get('/:key/persons', rodPersons) // страница: все персоны рода
  .post('/add', addRod)

module.exports = router.routes();
