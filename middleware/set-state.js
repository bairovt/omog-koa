'use strict';
const db = require('modules/arangodb');
const User = require('models/User');
const config = require('config');

module.exports = async function (ctx, next){
	/* set user state of the request */
	if (ctx.request.url !== '/sign/in' && ctx.request.url !== '/api/sign/in') {
		let persons = db.collection('Persons');
		let person = await persons.document(ctx.session.user_key);
		ctx.state.user = new User(person);
	}
	/* set env to state */
	// ctx.state.env = config.get.env;
	await next();
  console.log(ctx.session.user_key);
};
