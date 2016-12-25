'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');

const router = new Router();

// router.use('/', require('routes/main'));
function* rod(next) { //key
    let Rod = db.collection('Rod');    //todo: добавить обработку ошибки ArangoError: document not found, если коллекция не найдена
    let key = this.params.key;
    let rod = yield Rod.document(key);  //todo: добавить обработку ошибки ArangoError: document not found, если документ не найден
    // if (rod === undefined) this.throw(404);
    
    let personsCur = yield db.query(aql`FOR p IN Persons
                                            FILTER p.rod == ${'Rod/'+key}
                                            RETURN p`);
    let persons = yield personsCur.all();   
    
    yield this.render("rod/rod", { rod, persons });
}

//main router
router.get('/:key', rod);    // страница человека

module.exports=router.routes();