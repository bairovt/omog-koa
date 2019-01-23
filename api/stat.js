'use strict';

const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();


async function getStat(ctx){
  const stat = await db.query(aql`
  RETURN {
    personCount: FIRST(FOR p IN Persons
      COLLECT WITH COUNT INTO length
      RETURN length),
    userCount: FIRST(FOR p IN Persons
      FILTER p.user.status == 1
      COLLECT WITH COUNT INTO length
      RETURN length)
  }`).then(cursor => cursor.next());
  ctx.body = {
    stat
  };
}

router
  .get('/', getStat);

module.exports = router.routes();
