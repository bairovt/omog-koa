'use strict';
const db = require('../lib/arangodb');
const Joi = require('joi');
const {findClosestUsers} = require('../lib/fetch-db');
const {nameSchema} = require('../lib/schemas');

class Person {
	constructor(person){
		this._key = person._key;
		this._id = person._id;
		this.name = person.name;
		this.midname = person.midname;
		this.surname = person.surname;
		this.addedBy = person.addedBy;
	}

  static async create(personData, addedBy){
    // todo: доделать валидацию
    const validPerson = Joi.attempt(personData, Person.schema);
    validPerson.created = new Date(); // todo: rename to createdAt
    validPerson.addedBy = addedBy;
    const persons = db.collection('Persons');
    return await persons.save(validPerson);
  }

  static async getBy(handle) {
    const persons = db.collection('Persons');
    return await persons.document(handle);
  }

  static async createChildEdge(edgeData, fromId, toId) {
    const Child = db.edgeCollection('child');
    edgeData.created = new Date(); // todo: rename to addedAt
    await Child.save(edgeData, fromId, toId);
  }
}

Person.schema = Joi.object().keys({
  _key: Joi.string().trim().regex(/^[a-zA-Z0-9]+$/).min(3).max(30).allow(null),
  name: nameSchema.required(),
  surname: nameSchema.empty('').allow(null),
  midname: nameSchema.empty('').allow(null),
  maidenName: nameSchema.empty('').allow(null),
  info: Joi.string().trim().min(1).max(3000).empty('').allow(null),
  rod: Joi.string().max(100).allow(null), // allow('') is same: empty('').default('')
  gender: Joi.number().integer().min(0).max(1).required(),
  born: Joi.number().integer().min(0).max(2020).empty('').allow(null),
  died: Joi.number().integer().min(0).max(2020).empty('').allow(null),
});

module.exports = Person;
