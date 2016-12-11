'use strict';

// Person section
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const authorize =require('middleware/authorize');
const utils = require('utils')
const {nameProc, personKeyGen} = utils;

const router = new Router();


function* main(next) {  
    let cursor = yield db.query(aql`FOR p IN Persons SORT p.fullname RETURN p`);
    let persons = yield cursor.all();
    yield this.render("main", { persons });    
};

function* all(next) {  
    let cursor = yield db.query(aql`FOR p IN Persons SORT p.fullname RETURN p`);
    let persons = yield cursor.all();
    yield this.render("all", { persons });    
};

let Persons = db.collection('Persons');

router
    .get('/login', function*(next){
        if (this.session.user) this.redirect('/person/'+this.session.user.key);
        this.body = yield this.render('login');
    })
    .post('/login', function* (next){
        // yield* authenticate(login, password, this);
        let {email, password} = this.request.body;
        let person = yield Persons.firstExample({email: email});        
        if (person && person.password == password) {
            this.session.user = {key: person._key, id: person._id, name: person.name};
            this.redirect('/'); // todo: сделать возврат на запрашиваемую страницу
        }
        this.redirect('/login')        
    })
    .get('/logout', function *(next){
        this.session = null;
        this.redirect('/');
    });

//main router
router    
    .get('/', main)    // страница человека    
    .get('/all', all)    // страница человека    

module.exports = router.routes();


    // // формируем объект массивов поколений: ключ - глубина колена, значение - массив предков этого колена
    // let gens = ancestors.reduce(function(gens, current, index) {
    //  if (index == 0) return gens; // игнорируем 0-й элемент (person)
    //  let i = current.edges.length; // глубина колена текущего предка
    //  if (typeof gens[i] === 'undefined') gens[i] = []; // инициируем массив предков i-го колена, если его нет
    //  gens[i].push(cursor.fullname); // добавляем предка в массив предков i-го колена
    //  return gens;
    // }, {}); // на входе пустой объект
    // let gensCount = Object.keys(gens).length;
