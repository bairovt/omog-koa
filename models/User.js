'use strict';

 module.exports = class User {
	constructor(user){
		this._key = user._key;
		this._id = user._id;
		this.name = user.name;
		this.roles = user.roles || [];
	}

	isAdmin(){
		/* Checks if user is admin */
		return this.roles.includes('admin');
	}

	hasRoles(allowedRoles){ // array of roles (strings)
		/* Check if user has one of the allowed roles */
		return this.roles.some(role => allowedRoles.includes(role)); // true or false
	}

	hasRole(role){ // string
		/* Check if user has a role */
		return this.roles.includes(role); // true or false
	}
};