'use strict';

const Joi = require('joi');

const nameSchema = Joi.string().trim().min(1).max(100);
const textSchema = Joi.string().trim().min(1).max(30000);
const emailSchema = Joi.string().trim().email();

module.exports = {nameSchema, textSchema, emailSchema};
