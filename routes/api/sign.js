'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const md5 = require('md5');

async function signIn(ctx, next){
    let {email, password} = ctx.request.body;
    let persons = db.collection('Persons');
    let person = await persons.firstExample({email});
    if (person && person.password === md5(password)) {
      ctx.session.user_key = person._key;
      ctx.body = {location:'/#/rods'};
      // todo: сделать возврат на запрашиваемую страницу
    } else {
      ctx.status = 401;
      ctx.body = {
        message: 'invalid credentials'
      };
    }
}

async function signOut(ctx, next){
    ctx.session = null;
    ctx.body = {location: '/#/signin'};
}

async function signTest(ctx, next){
    ctx.body = {location: '/#/signTest'};
}

router
    .post('/in', signIn)
    .get('/out', signOut)
    .get('/test', signTest);

module.exports = router.routes();
