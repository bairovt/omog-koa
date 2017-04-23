'use strict';

 module.exports = class User {
	// constructor(person){
	// 	this._key = person._key;
	// 	this._id = person._id;
	// 	this.name = person.name;
	// 	this.roles = person.user.roles || [];
	// }

	constructor(profile){
		this._key = profile.userKey;
		this._id = profile.userId;
		this.name = profile.name;
		this.roles = profile.userRoles || [];
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