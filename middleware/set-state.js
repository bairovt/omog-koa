'use strict';
const db = require('modules/arangodb');
const User = require('models/User');

module.exports = async function (ctx, next){
	/* set user state of the request */
	if (ctx.request.url !== '/sign/in' && ctx.request.url !== '/api/user/signin') {
		let persons = db.collection('Persons');
		let person = await persons.document(ctx.session.user_key);
		ctx.state.user = new User(person);
	}
	await next();
};