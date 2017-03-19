'use strict';
const translit = require('transliteration').transliterate;
const db = require('modules/arangodb');
const aql = require('arangojs').aql;

function procName(name) {
	name = name.trim(); // убираем пробелы по краям
	if (name === "") return "";
	name = name[0].toUpperCase() + name.slice(1); // первая буква - большая
	return name;
}

function procText(text) {
	text = text.trim(); // убираем пробелы по краям
	if (text === "") return "";
	text = text[0].toUpperCase() + text.slice(1); // первая буква - большая
	return text;
}

async function personKeyGen(surname, name , midname) {
	let fullname = surname+name+midname;
	// транслитерация todo: проверить работу транслита с иностр. язык (монгольский, бурядский, китайский)
	let key = translit(fullname.replace(/\s/g, "")); // удалить все возможные пробелы в имени,
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

async function getPerson(key) {
	let Persons = db.collection('Persons');
	return await Persons.document(key);
}

async function createChildEdge(ctx, fromId, toId) {
	const Child = db.edgeCollection('child');
	let childEdge = {
		created: new Date(),
		addedBy: ctx.state.user._id
	};
	await Child.save(childEdge, fromId, toId);
}

module.exports = {procName, procText, personKeyGen, getPerson, createChildEdge};