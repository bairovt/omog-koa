'use strict';
const db = require('lib/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');

const router = new Router();

async function allRods(ctx, next) {
  let rods = await db.query(aql`FOR rod IN Rods
                                  SORT rod.order
                                  RETURN merge(rod,
                                    {count: FIRST(FOR p IN Persons
                                               FILTER p.rod == rod._id
                                               COLLECT WITH COUNT INTO length
                                               RETURN length)
                                    })`).then(cursor => cursor.all());
//todo: проверить безопасность
  ctx.body = {rods};
}

async function rodPersons(ctx, next) { //key
  let Rods = db.collection('Rods');
  let key = ctx.params.key;
  let rod = await Rods.document(key);
  let persons = await db.query(aql`FOR p IN Persons
	                                      FILTER p.rod == ${'Rods/'+key}
	                                      RETURN p`).then(cursor => cursor.all());
  ctx.body = { rod, persons };
}

router
    .get('/all', allRods)    // страница: все рода
    .get('/:key/persons', rodPersons);    // страница: все персоны рода

module.exports = router.routes();
