'use strict';

//const config = require('config');
const arangojs = require('arangojs');


const db = new arangojs.Database({
	url: 'http://root:ultra@127.0.0.1:8529',
	databaseName: 'rod'
});

module.exports = db;