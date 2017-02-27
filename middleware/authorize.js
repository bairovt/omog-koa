'use strict';

// Authorization middleware
// checks if a user's role is allowed (roles)
// all forms should use a POST method

const {isAdmin} = require('utils');

module.exports = function (allowedRoles){
	return async function (ctx, next) {
		let authorized = false;
		let user = ctx.session.user;

		// console.log(user.roles);
		if (!user.roles) ctx.throw(401, 'Unauthorized'); // если нет массива roles

		for (let i = 0; i < user.roles.length; i++){
			authorized = isAdmin(user) || allowedRoles.indexOf(user.roles[i]) != -1; // is authorized, true or false, admin is all allowed
			if (authorized) break;
		}

		if (!authorized) ctx.throw(401, 'Unauthorized');
		else await next();
	}
};