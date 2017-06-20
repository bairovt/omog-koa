'use strict';

const db = require('lib/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const secretKey = require('config').get('secretKeys')[0];
const {checkPassword} = require('lib/password');

async function signIn(ctx){
  const {email, password} = ctx.request.body;
  const person = await db.query(aql`FOR p IN Persons FILTER p.user.email==${email} RETURN p`).then(cursor => cursor.next());
  if (!person) ctx.throw(401, 'Неверный логин или пароль');
  const passCheck = await checkPassword(password, person.user.passHash);
  if (passCheck && person.user.status===1) {
    // ctx.session.user_key = person._key;
    const profile = {     //payload
      name: person.name,
      userKey: person._key,
      userId: person._id,
      userRoles: person.user.roles
    };
    const authToken = jwt.sign(profile, secretKey);
    ctx.body = {
      authToken,
      user: {
        /* same as in currentUser function (candidate for refactoring) */
        _key: person._key,
        name: person.name
      },
      location:'rods' // todo: сделать возврат на запрашиваемую страницу
    };
  } else {
    ctx.throw(401, 'Неверный логин или пароль');
  }
}

async function currentUser(ctx){
  /* current user is fetched when vue app is created (candidate for refactoring) */
  ctx.body = {
    user: {
      name: ctx.state.user.name,
      _key: ctx.state.user._key
    }
  }
}

router
  .post('/signin', signIn)
  .get('/current', currentUser);

module.exports = router.routes();