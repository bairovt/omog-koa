'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();

async function rod(ctx, next) { //key
	let Rods = db.collection('Rods');
	let key = ctx.params.key;
	let rod = await Rods.document(key);
	let personsCur = await db.query(aql`FOR p IN Persons
	                                      FILTER p.rod == ${'Rods/'+key}
	                                      RETURN p`);
	let persons = await personsCur.all();
	await ctx.render("rod/rod", { rod, persons });
}

async function getAllRods(ctx, next) {
  let rods = await db.query(aql`FOR rod IN Rods
                                    /*FILTER rod._key == "Sharaid"*/
												RETURN merge(rod,
													{count: FIRST(FOR p IN Persons
													           FILTER p.rod == rod._id
													           COLLECT WITH COUNT INTO length
													           RETURN length)
													})`).then(cursor => cursor.all());
  await ctx.render("rod/all_rods", { rods });
}

router
    .get('/all', getAllRods) // страница все рода
		.get('/:key', rod);    // страница рода


module.exports=router.routes();