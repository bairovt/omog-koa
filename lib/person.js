'use strict';
const db = require('lib/arangodb'),
      aql = require('arangojs').aql,
      {hashPassword} = require('lib/password'),
      {personSchema, userSchema} = require('lib/schemas'),
      Joi = require('joi');

async function createPerson(personData, addedBy){
  // todo: доделать валидацию
  const validPerson = Joi.attempt(personData, personSchema);
  validPerson.created = new Date();
  validPerson.addedBy = addedBy;
  const Persons = db.collection('Persons');
  return await Persons.save(validPerson);
}

async function createUser (personId, userData){
  // todo: доделать валидацию
  const validUser = Joi.attempt(userData, userSchema);
  validUser.status = 1;
  validUser.passHash = await hashPassword(validUser.password);
  validUser.password = undefined; // remove password
  // person.user = validUser;
  const Persons = db.collection('Persons');
  return await Persons.update(personId, {user: validUser});
}

async function createChildEdge(fromId, toId, addedBy) {
  const Child = db.edgeCollection('child');
  let childEdge = {
    created: new Date(),
    addedBy
  };
  await Child.save(childEdge, fromId, toId);
}

module.exports = {createPerson, createChildEdge, createUser};