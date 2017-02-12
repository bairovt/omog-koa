'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
// const authorize =require('middleware/authorize');
const utils = require('utils');
const {nameProc, textProc, personKeyGen} = utils;

const router = new Router();

/* Person page */
function* get_anc_des(next) {
    let {person_key} = this.params;
    // let person_id = "Persons/" + person_key;

    //извлечь персону с родом и добавившим
    let person = yield db.query(aql`
        FOR p IN Persons
            FILTER p._key == ${person_key}
            RETURN merge(p, { 
                rod: FIRST(FOR rod IN Rod            
                        FILTER p.rod == rod._id
                        RETURN {name: rod.name, key: rod._key}),
                addedBy: FIRST(FOR added IN Persons
                            FILTER added._id == p.addedBy
                            RETURN {name: added.name, key: added._key})
            })`
    ).then(cursor => cursor.next());

    // check existence
    if (person === undefined) this.throw(404);

    // находим предков персоны
    let ancestors = yield db.query(
        aql`FOR v, e, p
            IN 1..100 INBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edge: e, edges: p.edges}`
        ).then(cursor => cursor.all());

    // находим потомков персоны
    let descendants = yield db.query(
        aql`FOR v, e, p
            IN 1..100 OUTBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edge: e, edges: p.edges}`
        ).then(cursor => cursor.all());

    this.body = {person, ancestors, descendants }; //gens, gensCount
}

/* /ajax */
router    
    .get('/get_anc_des/:person_key', get_anc_des);    // страница человека
    //.use(authorize(['admin', 'manager']))
    // .get('/:key/add/:rel', addPerson)   // страница добавления человека
    // .post('/:key/add/:rel', addPerson)    // обработка добавления человека
    // .get('/:key/remove', removePerson);


module.exports = router.routes();