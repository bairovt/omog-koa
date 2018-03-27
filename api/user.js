'use strict';

const db = require('lib/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const secretKey = require('config').get('secretKeys')[0];
const {checkPassword} = require('lib/password');
const transporter = require('lib/transporter')

async function signIn(ctx){
  let {email, password} = ctx.request.body;
  email = email.toLowerCase()
  const person = await db.query(aql`FOR p IN Persons FILTER p.user.email==${email} RETURN p`).then(cursor => cursor.next());
  if (!person) ctx.throw(401, 'Неверный email или пароль');
  const passCheck = await checkPassword(password, person.user.passHash);
  if (passCheck && person.user.status === 1) {
    const profile = {     //payload
      name: person.name,
      _key: person._key,
      _id: person._id,
      roles: person.user.roles
    };
    const authToken = jwt.sign(profile, secretKey);
    ctx.body = {
      authToken,
      person_key: person._key // todo: сделать возврат на запрашиваемую страницу
    };
  } else {
    ctx.throw(401, 'Неверный email или пароль');
  }
}

// async function createUser(ctx) {
//   return ctx.body = {}
// }

router
  .post('/signin', signIn)
  // .post('/create', createUser);

module.exports = router.routes();
