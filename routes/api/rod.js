'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');

const router = new Router();

async function getAllRods(ctx, next) {
  let rods = await db.query(aql`FOR rod IN Rods
                                    /*FILTER rod._key == "Sharaid"*/
												RETURN merge(rod,
													{count: FIRST(FOR p IN Persons
													           FILTER p.rod == rod._id
													           COLLECT WITH COUNT INTO length
													           RETURN length)
													})`).then(cursor => cursor.all());
  // await ctx.render("rod/all_rods", { rods });

  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.body = {rods};
}

router    
    .get('/get-all-rods', getAllRods);    // страница человека
    //.use(authorize(['admin', 'manager']))
    // .get('/:key/add/:rel', addPerson)   // страница добавления человека
    // .post('/:key/add/:rel', addPerson)    // обработка добавления человека
    // .get('/:key/remove', removePerson);


module.exports = router.routes();