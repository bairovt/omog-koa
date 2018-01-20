'use strict';

 module.exports = class User {
	constructor(profile){
		this._key = profile._key;
		this._id = profile._id;
		this.name = profile.name;
		this.roles = profile.roles || [];
	}

	isAdmin(){
		/* Checks if user is admin */
		return this.roles.includes('admin');
	}

	hasRoles(allowedRoles){ // array
    if (this.roles.includes('admin')) return true // admin has all roles
		/* Check if user has one of the allowed roles */
		return this.roles.some(role => allowedRoles.includes(role)); // true or false
	}

	hasRole(role){ // string
		/* Check if user has a role */
		return this.roles.includes(role); // true or false
	}
};
