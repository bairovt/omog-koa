'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');

const router = new Router();

/* main page */
function* index(next) {
    let rods = yield db.query(aql`FOR r IN Rod RETURN r`).then(cursor => cursor.all());
    yield this.render("main", { rods });
}

function* all(next) {
    let cursor = yield db.query(aql`FOR p IN Persons SORT p.fullname RETURN p`);
    let persons = yield cursor.all();
    yield this.render("all", { persons });
}

function* getLogin(next){
    if (this.session.user) this.redirect('/person/'+this.session.user.key);
    this.body = yield this.render('login');
}

function* postLogin(next){
    // yield* authenticate(login, password, this);
    let {email, password} = this.request.body;
    let Persons = db.collection('Persons');
    let person = yield Persons.firstExample({email});
    if (person && person.password == password) {
        this.session.user = {key: person._key, id: person._id, name: person.name};
        this.redirect('/'); // todo: сделать возврат на запрашиваемую страницу
    }
    this.redirect('/login');
}

function* logout(next){
    this.session = null;
    this.redirect('/');
}

router
    .get('/', index)
    .get('/login', getLogin)
    .post('/login', postLogin)
    .get('/logout', logout)
    .get('/all', all);

module.exports = router.routes();
