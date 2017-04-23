'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const {hashPassword} = require('utils/password');
const Joi = require('joi');

async function createPerson(personData, addedBy, opts={}){
  /**
   * opts = {addedBy, userData}
   * */
  // todo: доделать валидацию данных клиента
  let nameSchema = Joi.string().trim().min(1).max(100);
  let textSchema = Joi.string().trim().min(1).max(30000);
  let personSchema = Joi.object().keys({
    name: nameSchema.required(),
    surname: nameSchema.default(''),
    midname: nameSchema,
    maidenName: nameSchema,
    lifestory: textSchema,
    rod: Joi.string().min(3).max(100),
    gender: Joi.number().integer().min(0).max(1).required(),
  });
  let validPerson = Joi.attempt(personData, personSchema);
  validPerson.created = new Date();
  validPerson.addedBy = addedBy;

  if (opts.userData) {
    let userSchema = Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().token().min(1).max(100).required()
    });
    let validUser = Joi.attempt(opts.userData, userSchema);
    validUser.status = 1;
    validUser.passHash = await hashPassword(validUser.password);
    validUser.password = undefined; // remove password
    validPerson.user = validUser;
  }
  let Persons = db.collection('Persons');
  return await Persons.save(validPerson);
}

async function createChildEdge(fromId, toId, addedBy) {
  const Child = db.edgeCollection('child');
  let childEdge = {
    created: new Date(),
    addedBy
  };
  await Child.save(childEdge, fromId, toId);
}

module.exports = {createPerson, createChildEdge};