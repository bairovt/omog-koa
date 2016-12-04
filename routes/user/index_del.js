'use strict';
// 'user' section

const db = require('modules/orientdb');
const Router = require('koa-router');
const authenticate = require('modules/authenticate');

let router = new Router();

let Persons = db.collection('Persons');

router
    .get('/login', function*(next){
        if (this.session.user) this.redirect('/person/'+this.session.user._key);
        this.body = yield this.render('user/login.html');
    })
    .post('/login', function* (next){
        let {email, password} = this.request.body;
        let person = yield Persons.firstExample({email: email});
        console.log(person);
        if (person.password == password)
        this.session.user = person;
        this.redirect('/') // todo: сделать возврат на запрашиваемую страницу
        // yield* authenticate(login, password, this);
    })
    .get('/logout', function *(next){
        this.session = null;
        this.redirect('/');
    });
    // .get('/profile', function *(next){
    //     let urid =this.session.urid;
    //     if (urid) {
    //         let users = yield db.query(`SELECT firstname, surname, patronym, role.code as role FROM ${urid}`); //${urid}
    //         this.body = yield this.render('user/profile.html', {user: users[0]});
    //     } else {
    //         this.redirect('/user/login');
    //     }
    // });

module.exports = router.routes();