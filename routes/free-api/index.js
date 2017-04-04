'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const utils = require('utils');

const router = new Router();

async function getHeroContribs(ctx, next) {
  const contribs = await db.query(aql`FOR c IN HeroContribs SORT c.date RETURN c`).then(cursor => cursor.all());
  ctx.set('Access-Control-Allow-Origin', '*'); // allow cross site request (for requests from hero.rod.so)
  return ctx.body = {contribs};
}

async function getRoundTable(ctx, next) {
  const persons = await db.query(aql`FOR p IN RoundTable SORT p.roundTableOrder, p.fullname RETURN p`).then(cursor => cursor.all());
  ctx.set('Access-Control-Allow-Origin', '*'); // allow cross site request (for requests from hero.rod.so)
  return ctx.body = {persons};
}

async function getMemoryBook(ctx, next) {
  const letter = ctx.params.letter.toLowerCase();
  let pattern =  '';
  let name = ctx.query.name || '';
  let lifestory = ctx.query.lifestory || '';
  let cursor = null;
  switch(letter){
    case 'all':
      cursor = await db.query(aql`FOR p IN Persons FILTER p.repressed==1 SORT p.name RETURN p`);
      break;
    case 'search':
      cursor = await db.query(aql`FOR p IN Persons FILTER p.repressed==1
					    AND REGEX_TEST(p.name, ${name}, true)
					    AND REGEX_TEST(p.lifestory, ${lifestory}, true)
					    SORT p.name RETURN p`);
      break;
    default:
      pattern =  letter+'%';
      cursor = await db.query(aql`FOR p IN Persons FILTER p.repressed==1 AND LOWER(p.name) LIKE ${pattern} SORT p.name RETURN p`);//.then(cursor => cursor.all());
      break;
  }
  const persons = await cursor.all();
  ctx.set('Access-Control-Allow-Origin', '*'); // allow cross site request (for requests from hero.rod.so)
  return ctx.body = {persons};
}

router
// .get('/get-anc-des/:person_key', getAncDes)    // страница человека
    .get('/hero-contribs', getHeroContribs)
    .get('/round-table', getRoundTable)
    .get('/memorybook/:letter', getMemoryBook);

module.exports = router.routes();