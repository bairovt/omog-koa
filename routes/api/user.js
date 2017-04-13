'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const {checkPassword} = require('utils/password');

async function signIn(ctx){
  const {email, password} = ctx.request.body;
  const person = await db.query(aql`FOR p IN Persons FILTER p.user.email==${email} RETURN p`).then(cursor => cursor.next());
  // todo: изменить алгоритм хэша пароля на более безопасный
  const isTruePass = await checkPassword(password, person.user.passHash);
  if (person && isTruePass) {
    ctx.session.user_key = person._key;
    ctx.body = {location:'rods'};
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
  ctx.body = {location: '/signin'};
}

router
  .post('/signin', signIn)
  .get('/signout', signOut);

module.exports = router.routes();