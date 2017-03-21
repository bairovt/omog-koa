'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const md5 = require('md5');

async function getLogin(ctx, next){
    if (ctx.session.user_key) ctx.redirect('/person/'+ctx.session.user_key);
    ctx.body = await ctx.render('login');
}

async function postLogin(ctx, next){
    // await* authenticate(login, password, this);
    let {email, password} = ctx.request.body;
    let persons = db.collection('Persons');
    let person = await persons.firstExample({email});
    if (person && person.password == md5(password)) {
        // ctx.session.user = {_key: person._key, _id: person._id, name: person.name, roles: person.roles};
        ctx.session.user_key = person._key;
        ctx.redirect('/'); // todo: сделать возврат на запрашиваемую страницу
    }
    ctx.redirect('/login');
}

async function logout(ctx, next){
    ctx.session = null;
    ctx.redirect('/');
}

router
    .get('/login', getLogin)
    .post('/login', postLogin)
    .get('/logout', logout);

module.exports = router.routes();
