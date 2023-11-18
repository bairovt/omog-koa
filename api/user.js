'use strict';

const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const secretKey = require('config').get('secretKeys')[0];
const sendMail = require('../lib/transporter');
const authorize = require('../middleware/authorize');
const User = require('../models/User');
const Person = require('../models/Person');
const {emailSchema} = require('../lib/schemas');
const config = require('config');

async function signIn(ctx){
  let {email, password} = ctx.request.body;
  email = email.toLowerCase();
  const person = await db.query(aql`
    FOR p IN Persons
      FILTER p.user.email==${email}
      RETURN p
  `).then(cursor => cursor.next());
  if (!person) ctx.throw(401, 'Неверный email или пароль');
  const passCheck = await User.checkPassword(password, person.user.passHash);
  if (!passCheck) return ctx.throw(401, 'Неверный email или пароль');
  // todo: show license agreement confirmation if status = 3
  if ([1, 3].includes(person.user.status)) {
    const jwtPayload = {
      name: person.name,
      fullname: `${person.name} ${person.surname}`,
      _key: person._key,
      _id: person._id,
      roles: person.user.roles
    };
    const authToken = jwt.sign(jwtPayload, secretKey);
    ctx.body = {
      authToken,
      person_key: person._key // todo: сделать возврат на запрашиваемую страницу
    };
  } else {
    ctx.throw(403, 'Пользователь не активен');
  }
}

async function inviteUser(ctx) {
  // todo: process only for person.user === null
  // TODO: check permissions: only manager or higher and dedicated users (with canInvite: true)
  // TODO: tests
  if (ctx.state.user.hasRoles(["manager", "inviter"])) {
  } else ctx.throw(403, "Forbidden to invite user");
  // status: 0=invited (not confirmed), 1=active, 2=banned
  const { person_key } = ctx.params;
  let { email } = ctx.request.body;
  const person = await Person.get(person_key);
  if (person.user) ctx.throw(400, "person is user already");
  // todo: restrict users that can be added?: например - не дальше двоюродных
  email = Joi.attempt(email, emailSchema);
  const password = Math.random().toString(36).slice(-10); // generate password
  const mailOptions = {
    // from: '"omog.me" <info@omog.me>',
    from: '<' + config.get("mailer.user") + '>',
    to: email,
    cc: config.get("mailer.user"),
    subject: `Приглашение на omog.me`,
    html: `<p>${ctx.state.user.fullname} приглашает Вас, ${person.name}, присоединиться к родовой сети
      <b><a target="_blank" href="https://omog.me">omog.me</a></b></p>
      <p>Ваш пароль для входа: <b>${password}</b></p>
    `,
  };

  await sendMail(mailOptions); // todo: rollback transaction if send error ??
  const userData = {
    email,
    password,
    status: 1, // todo: change to 3 (error when login: findClosestUsers -> FILTER v.user.status == 1)
    invitedAt: new Date(),
    invitedBy: ctx.state.user._id,
  };
  await User.create(person._id, userData);
  return (ctx.body = { message: "user created" });
}

router
  .post('/signin', signIn)
  .post('/invite/:person_key', inviteUser);

module.exports = router.routes();
