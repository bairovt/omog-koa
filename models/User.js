'use strict';

const crypto = require('crypto');
const Joi = require('joi');
const {findClosestUsers} = require('../lib/fetch-db');


const userSchema = Joi.object().keys({
  email: Joi.string().trim().email().required(),
  password: Joi.string().regex(/^[a-zA-Z0-9`~!@#$%^&\*()_=+/{}[\];:'"\\|,.<>-]|\?{3,30}$/).required(),
  status: Joi.number().integer().min(0).max(5).required(),
  invitedAt: Joi.date().allow(null),
  invitedBy: Joi.string().allow(null)
});

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

  static async create(personId, userData) {
    // todo: доделать валидацию
    const validUser = Joi.attempt(userData, userSchema);
    validUser.email = validUser.email.toLowerCase();
    // validUser.status = validUser.status || 1;
    validUser.passHash = await User.hashPassword(validUser.password);
    validUser.password = undefined;
    const persons = db.collection('Persons');
    return await persons.update(personId, {user: validUser});
  }

   static hashPassword(password, salt) { //promise
     if(!salt) salt = crypto.randomBytes(32).toString("base64"); //при проверке пароля указываем salt
     return new Promise((resolve, reject) => {
       crypto.pbkdf2(password, salt, 10000, 32, 'sha256', function(err, hash){
         if(err) {
           return reject(err);
         }
         return resolve(salt+'.'+hash.toString("base64"));
       })
     })
   }

   static checkPassword(password, passHash) { //promise
     const [salt, hash] = passHash.split('.');
     return User.hashPassword(password, salt)
       .then(newPassHash => {
         return  newPassHash === passHash;
       });
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

  // todo: cover by tests
  async checkPermission(person_id, options={}) {
    if (options.manager) {
      if ( this.hasRoles(['manager']) ) return true
    }
    let closestUsers = await findClosestUsers(person_id); // юзеры, которые могут изменять person
    if (closestUsers.some(item => item._id === this._id)) return true;  // если user является ближайшим родственником-юзером
    return false
  }
};
