'use strict';

const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const secretKey = require('config').get('secretKeys')[0];
const {checkPassword} = require('../lib/password');
const sendMail = require('../lib/transporter');
const authorize = require('../middleware/authorize');
const {emailSchema} = require('../lib/schemas');
const {fetchPerson} = require('../lib/fetch-db');
const {createUser} = require('../lib/person');

async function signIn(ctx){
  let {email, password} = ctx.request.body;
  email = email.toLowerCase()
  const person = await db.query(aql`
    FOR p IN Persons
      FILTER p.user.email==${email}
      RETURN p
  `).then(cursor => cursor.next());
  if (!person) ctx.throw(401, 'Неверный email или пароль');
  const passCheck = await checkPassword(password, person.user.passHash);
  if (!passCheck) return ctx.throw(401, 'Неверный email или пароль');
  // todo: show license agreement confirmation if status = 3
  if ([1, 3].includes(person.user.status)) {
    const profile = {     //payload
      name: person.name,
      fullname: `${person.name} ${person.surname}`,
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
    ctx.throw(403, 'Пользователь не активен');
  }
}

async function inviteUser(ctx) { // todo: process only for person.user === null
  // status: 1=active, 2=banned, 3=invited (not confirmed)
  const {person_key} = ctx.params;
  let {email} = ctx.request.body;
  const person = await fetchPerson(person_key);
  if (person.user) ctx.throw(400, 'person is user already');

  email = Joi.attempt(email, emailSchema);
  const password = Math.random().toString(36).slice(-8); // generate password
  console.log(password);
  const userData = {
    email, password,
    status: 1, // todo: change to 3 (error when login: findClosestUsers -> FILTER v.user.status == 1)
    invitedAt: new Date(),
    invitedBy: ctx.state.user._id
  };
  await createUser(person._id, userData);
  const mailOptions = {
    from: '"MyRod.info" <mail@myrod.info>',
    to: email,
    subject: `Приглашение на MyRod.info`,
    html: `<p>${ctx.state.user.fullname} приглашает Вас присоединиться к родовой сети
      <b><a target="_blank" href="https://myrod.info">MyRod.info</a></b></p>
      <p>Ваш пароль для входа: <b>${password}</b></p>
    `
  }
  await sendMail(mailOptions);
  return ctx.body = {message: 'create user'};
}

router
  .post('/signin', signIn)
  .post('/invite/:person_key', authorize(['manager']), inviteUser);

module.exports = router.routes();
