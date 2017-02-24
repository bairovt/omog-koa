'use strict';

// Authorization middleware
// checks if a user's role is allowed (roles)
// all forms should use a POST method

const {isAdmin} = require('utils');

module.exports = function (allowedRoles){
	return function* (next) {
		let authorized = false;
		let user = this.session.user;

		// console.log(user.roles);
		if (!user.roles) this.throw(401, 'Unauthorized'); // если нет массива roles

		for (let i = 0; i < user.roles.length; i++){
			authorized = isAdmin(user) || allowedRoles.indexOf(user.roles[i]) != -1; // is authorized, true or false, admin is all allowed
			if (authorized) break;
		}

		if (!authorized) this.throw(401, 'Unauthorized');
		else yield next;
	}
};