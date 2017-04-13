'use strict';
const db = require('modules/arangodb');
const User = require('models/User');

/* authentication middleware */

module.exports = async function (ctx, next){
  if (ctx.session.user_key) { // user authenticated
    console.log(ctx.request.url);
    let persons = db.collection('Persons');
    let person = await persons.document(ctx.session.user_key);
    ctx.state.user = new User(person); // set user state of the request
    return await next();
  } // user is going to authenticate
  else if ( ['/sign/in', '/api/user/signin', '/api/user/signout'].includes(ctx.request.url) ) {
    return await next();
  }
  else { //request is not authenticated
	  ctx.status = 401;
	  ctx.body = {location: '/signin'};
  }
};
