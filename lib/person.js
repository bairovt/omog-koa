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



async function createChildEdge(edgeData, fromId, toId) {
  const Child = db.edgeCollection('child');
  edgeData.created = new Date(); // todo: rename to createdAt
  await Child.save(edgeData, fromId, toId);
}

module.exports = {createPerson, createChildEdge};
