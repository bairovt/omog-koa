'use strict';

const Joi = require('joi');

const nameSchema = Joi.string().trim().min(1).max(100);
const textSchema = Joi.string().trim().min(1).max(30000);

exports.personSchema = Joi.object().keys({
  name: nameSchema.required(),
  surname: nameSchema.default(''),
  midname: nameSchema.empty('').default(undefined),
  maidenName: nameSchema.empty('').default(undefined),
  lifestory: textSchema,
  rod: Joi.string().max(100).allow(''), // same: empty('').default('')
  gender: Joi.number().integer().min(0).max(1).required(),
  birthYear: Joi.number().integer().min(0).max(2020),
});

exports.userSchema = Joi.object().keys({
  email: Joi.string().email().required(),
  password: Joi.string().token().min(1).max(100).required()
});