'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const md5 = require('md5');

async function getSignIn(ctx, next){
    if (ctx.session.user_key) ctx.redirect('/person/'+ctx.session.user_key);
    ctx.body = await ctx.render('signin');
}

async function postSignIn(ctx, next){
    let {email, password} = ctx.request.body;
    let persons = db.collection('Persons');
    let person = await persons.firstExample({email});
    if (person && person.password == md5(password)) {
        // ctx.session.user = {_key: person._key, _id: person._id, name: person.name, roles: person.roles};
        ctx.session.user_key = person._key;
        ctx.redirect('/'); // todo: сделать возврат на запрашиваемую страницу
    }
    ctx.redirect('/sign/in');
}

async function signOut(ctx, next){
    ctx.session = null;
    ctx.redirect('/sign/in');
}

router
    .get('/in', getSignIn)
    .post('/in', postSignIn)
    .get('/out', signOut);

module.exports = router.routes();
