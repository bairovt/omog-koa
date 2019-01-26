'use strict';

const Joi = require('joi');

const nameSchema = Joi.string().trim().min(1).max(100);
const textSchema = Joi.string().trim().min(1).max(30000);
const emailSchema = Joi.string().trim().email();

const personSchema = Joi.object().keys({
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

module.exports = {nameSchema, textSchema, emailSchema, personSchema};
