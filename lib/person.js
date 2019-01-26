'use strict';
const db = require('../lib/arangodb'),
      aql = require('arangojs').aql,
      {personSchema, userSchema} = require('../lib/schemas'),
      Joi = require('joi'),
      {findClosestUsers} = require('../lib/fetch-db');
const User = require('../models/User');


async function createPerson(personData, addedBy){
  // todo: доделать валидацию
  const validPerson = Joi.attempt(personData, personSchema);
  validPerson.created = new Date(); // todo: rename to createdAt
  validPerson.addedBy = addedBy;
  const Persons = db.collection('Persons');
  return await Persons.save(validPerson);
}

async function createUser (personId, userData){
  // todo: доделать валидацию
  const validUser = Joi.attempt(userData, userSchema);
  validUser.email = validUser.email.toLowerCase();
  // validUser.status = validUser.status || 1;
  validUser.passHash = await hashPassword(validUser.password);
  validUser.password = undefined;
  const Persons = db.collection('Persons');
  return await Persons.update(personId, {user: validUser});
}

async function createChildEdge(edgeData, fromId, toId) {
  const Child = db.edgeCollection('child');
  edgeData.created = new Date(); // todo: rename to createdAt
  await Child.save(edgeData, fromId, toId);
}

// todo: cover by tests
async function checkPermission(user, person_id, options={}) {
  if (options.manager) {
    if ( user.hasRoles(['manager']) ) return true
  }
  let closestUsers = await findClosestUsers(person_id); // юзеры, которые могут изменять person
  if (closestUsers.some(item => item._id === user._id)) return true;  // если user является ближайшим родственником-юзером
  return false
}

module.exports = {createPerson, createChildEdge, createUser, checkPermission};
