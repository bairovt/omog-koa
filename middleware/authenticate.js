'use strict';
const db = require('lib/arangodb');
const User = require('models/User');
const jwt = require('jsonwebtoken');
const secretKey = require('config').get('secretKeys')[0];

/* authentication middleware */

module.exports = async function (ctx, next){
  // console.log('Auth header: ', ctx.request.header.authorization);
  if ( ['/api/user/signin', '/api/user/signout'].includes(ctx.request.url) ) {
    return await next();
  }
  const authHeader = ctx.request.header.authorization;
  if (authHeader) {
    const authToken = authHeader.split(' ').pop();
    const profile = jwt.verify(authToken, secretKey); //may throw JsonWebTokenError,
    ctx.state.user = new User(profile); // set user state of the request
    return await next();
  } else {
	  ctx.status = 401;
	  ctx.body = {
	    message: 'Empty authorization header',
	    location: '/signin'
	  };
  }
};