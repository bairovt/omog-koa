'use strict';

 module.exports = class User {
	constructor(person){
		this._key = person._key;
		this._id = person._id;
		this.name = person.name;
		this.roles = person.user.roles || [];
		this.status = person.user.status;
		this.canInvite = person.user.canInvite;
		this.fullname = `${person.name} ${person.surname}`;
	}

	isAdmin(){
		/* Checks if user is admin */
		return this.roles.includes('admin');
	}

	hasRoles(allowedRoles){ // array
    if (this.roles.includes('admin')) return true; // admin has all roles
		/* Check if user has one of the allowed roles */
		return this.roles.some(role => allowedRoles.includes(role)); // true or false
	}

	hasRole(role){ // string
    if (this.roles.includes('admin')) return true;
		/* Check if user has a role */
		return this.roles.includes(role); // true or false
	}
};
