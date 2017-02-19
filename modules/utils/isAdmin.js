'use strict';

// Check if user is admin

module.exports = function (person){
	return person.roles.indexOf('admin') != -1; // true or false
};