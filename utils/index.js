'use strict';
const translit = require('transliteration').transliterate;
const db = require('modules/arangodb');
const aql = require('arangojs').aql;

function nameProc(name) {
	name = name.trim(); // убираем пробелы по краям
	if (name === "") return "";
	name = name[0].toUpperCase() + name.slice(1); // первая буква - большая
	return name;
}

function textProc(text) {
	text = text.trim(); // убираем пробелы по краям
	if (text === "") return "";
	text = text[0].toUpperCase() + text.slice(1); // первая буква - большая
	return text;
}

async function personKeyGen(fullname) {
	// транслитерация todo: проверить работу транслита с иностр. язык
	let key = translit(fullname.replace(/\s/g, "")); // удалить все пробелы,
	// найти все совпадения в коллекции
	let matches = await db.query(aql`FOR p IN Persons
	    FILTER p._key LIKE ${key+'%'}
	    RETURN p._key`).then(cursor => cursor.all());
    // возврат ключа, если ключ не повторяется
	if (matches.length == 0) return key;
    /* если такой ключ уже есть, конкатенирум инрементный индекс */
	let indexes = matches.map(_key => +_key.split(key).pop()); // извлекаем индексы: SurnameNameM123 => 123
	let maxNum = Math.max(...indexes);
	return `${key}${maxNum+1}`; // new key
}

module.exports = {nameProc, textProc, personKeyGen};