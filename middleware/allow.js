'use strict';

// Authorization middleware
// checks if a user's role is allowed (roles)
// all forms should use a POST method

module.exports = function (allowedRoles){
	return function* (next) {
		let authorized = false;
		let userRoles = this.session.user.roles;
		// console.log(userRoles);
		if (!userRoles) this.throw(401, 'Unauthorized'); // если нет массива roles

		for (let i = 0; i < userRoles.length; i++){
			authorized = userRoles[i] == 'admin' || allowedRoles.indexOf(userRoles[i]) != -1; // is authorized, true or false, admin is all allowed
			if (authorized) break;
		}

		if (!authorized) this.throw(401, 'Unauthorized');
		else yield next;
	}
};