'use strict'
const translit = require('transliteration').transliterate;
const db = require('modules/arangodb');
const aql = require('arangojs').aql;

function nameProc(name) {
	name = name.trim(); // убираем пробелы по краям
	if (name === "") return "";
	name = name[0].toUpperCase() + name.slice(1); // первая буква - большая
	return name;
};

async function personKeyGen(fullname) {
	// транслитерация
	let _key = translit(fullname.replace(/\s/g, "")); // удалить все пробелы
	// найти все совпадения в коллекции
	let cursor = await db.query(aql`FOR p IN Persons
	    FILTER p._key LIKE ${_key+'%'}
	    RETURN p._key`);

	let matches = await cursor.all();
	if (matches.length == 0) return _key;
	
	let indexes = matches.map(key => +key.split(_key).pop());	
	let maxNum = Math.max(...indexes);		
	let newKey = `${_key}${maxNum+1}`;
	console.log(newKey);
	return newKey;
};

module.exports = {nameProc, personKeyGen};