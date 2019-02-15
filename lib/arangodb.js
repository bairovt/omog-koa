'use strict';

const config = require('config');
const arangojs = require('arangojs');


const url = config.get('db.URL');
const dbName = config.get('db.name');
const user = config.get('db.user');
const pass = config.get('db.password');
const db = new arangojs.Database({
  url
});
db.useDatabase(dbName);
db.useBasicAuth(user, pass)

module.exports = db;
