'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const secretKey = require('config').get('secretKeys')[0];
const {checkPassword} = require('utils/password');

async function signIn(ctx){
  const {email, password} = ctx.request.body;
  const person = await db.query(aql`FOR p IN Persons FILTER p.user.email==${email} RETURN p`).then(cursor => cursor.next());
  // todo: изменить алгоритм хэша пароля на более безопасный
  const isTruePass = await checkPassword(password, person.user.passHash);
  if (person && isTruePass) {
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
      location:'rods' // todo: сделать возврат на запрашиваемую страницу
    };
  } else {
    ctx.status = 401;
    ctx.body = {
      message: 'invalid credentials'
    };
  }
}

async function currentUser(ctx){
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