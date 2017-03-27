'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');

const router = new Router();

/* All persons page */
async function getAllPersons(ctx, next) {
  let persons = await db.query(aql`FOR p IN Persons SORT p.surname RETURN p`)
                        .then(cursor => {return cursor.all()});
  ctx.body = {persons};
}

/* Person page */
async function getAncDes(ctx, next) {
    let {person_key} = ctx.params;
    // let person_id = "Persons/" + person_key;

    //извлечь персону с родом и добавившим
    let person = await db.query(aql`
		  FOR p IN Persons
		      FILTER p._key == ${person_key}
		      RETURN merge(p, { 
		          rod: FIRST(FOR rod IN Rods            
		                  FILTER p.rod == rod._id
		                  RETURN {name: rod.name, _key: rod._key}),
		          addedBy: FIRST(FOR added IN Persons
		                      FILTER added._id == p.addedBy
		                      RETURN {name: added.name, surname: added.surname, _key: added._key})
		      })`
    ).then(cursor => cursor.next());

    // check existence
    if (person === undefined) ctx.throw(404);

    // находим предков персоны
    let ancestors = await db.query(
        aql`FOR v, e, p
            IN 1..100 INBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edge: e, edges: p.edges}`
        ).then(cursor => cursor.all());

    // находим потомков персоны
    let descendants = await db.query(
        aql`FOR v, e, p
            IN 1..100 OUTBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edge: e, edges: p.edges}`
        ).then(cursor => cursor.all());

    ctx.body = {person, ancestors, descendants }; //gens, gensCount
}

router
    .get('/all', getAllPersons)
    .get('/:person_key/get-anc-des', getAncDes);    // страница человека
    //.use(authorize(['admin', 'manager']))
    // .get('/:key/add/:rel', addPerson)   // страница добавления человека
    // .post('/:key/add/:rel', addPerson)    // обработка добавления человека
    // .get('/:key/remove', removePerson);


module.exports = router.routes();