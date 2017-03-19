'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const utils = require('utils');

const router = new Router();

async function getHeroContribs(ctx, next) {
  const contribs = await db.query(aql`FOR c IN HeroContribs SORT c.date RETURN c`).then(cursor => cursor.all());
  // console.log(typeof(contribs));
  ctx.set('Access-Control-Allow-Origin', '*'); // allow cross site request (for requests from hero.rod.so)
  return ctx.body = {contribs};
}

router
      // .get('/get-anc-des/:person_key', getAncDes)    // страница человека
      .get('/hero-contribs', getHeroContribs);

module.exports = router.routes();