'use strict';

const config = require('config');
const arangojs = require('arangojs');


const url = config.get('db.URL');
const user = config.get('db.user');
const pass = config.get('db.password');
const db = new arangojs.Database({
	url
});
db.useDatabase('rod');
db.useBasicAuth(user, pass)

module.exports = db;
