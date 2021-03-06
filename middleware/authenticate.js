'use strict';
const User = require('../models/User');
const Person = require('../models/Person');
const jwt = require('jsonwebtoken');
const secretKey = require('config').get('secretKeys')[0];
const _ = require('lodash');

/* authentication middleware */
// todo:bug удалил тестового пользователя t@t.t, не разлогинивал его, он все еще способен загружать данные (кроме своих)
module.exports = async function (ctx, next){
  if ( ['/api/user/signin', '/api/user/signout'].includes(ctx.request.url) ) {
    return await next();
  }
  const authHeader = ctx.request.header.authorization;
  if (!authHeader) return ctx.throw(401, 'Empty authorization header');

  const authToken = authHeader.split(' ').pop();
  const jwtPayload = jwt.verify(authToken, secretKey); //may throw JsonWebTokenError,

  //todo: cover by tests
  const user = await User.get(jwtPayload._key);
  if (!user ||
    user.status !== 1 ||
    !_.isEqual(_.sortBy(user.roles), _.sortBy(jwtPayload.roles))
  ) ctx.throw(401, 'Jwt payload is not valid');

  ctx.state.user = user;
  return await next()
};
