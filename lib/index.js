'use strict';
const translit = require('transliteration').transliterate;
const db = require('./arangodb');
const aql = require('arangojs').aql;
const CustomError = require('../lib/custom-error')

function procName(name) { // todo: test
  // throw new Error('Ошибка валидации');
  // todo: проработать угрозу aql-инъекций
  if (!name) return undefined;
	name = name.trim(); // убираем пробелы по краям
  if(name.length > 150) throw(new CustomError(400, 'Name is too long'))
	// if (name === "") return "";
	name = name[0].toUpperCase() + name.slice(1); // первая буква - большая
	return name;
}

function procText(text) { // todo: test
  if (!text) return undefined;
  // todo: проработать угрозу aql-инъекций
	text = text.trim(); // убираем пробелы по краям
  if(text.length > 15000) throw(new CustomError(400, 'Text is too long'))
	// if (text === "") return "";
	text = text[0].toUpperCase() + text.slice(1); // первая буква - большая
	return text;
}

async function personKeyGen(surname, name , midname) {
	/* Не испльзуется, т.к. было решено использовать автогенерируемые ключи */
  let fullname = surname + '_' + name + '_' + midname;
  let key = fullname.replace(/\s+/g, "_"); // заменить пробелы на _,
  // транслитерация todo: проверить работу транслита с иностр. язык (монгольский, бурядский, китайский)
  key = translit(key);
  key = key.toLowerCase();
  // найти все совпадения в коллекции
  let pattern = "^" + key + "\\d*$";
  let matches = await db.query(aql`FOR p IN Persons		
		FILTER REGEX_TEST(p._key, ${pattern}, true) == true
		RETURN p._key`).then(cursor => cursor.all());
  if (matches.length === 0) {	// возврат ключа, если ключ не повторяется
    return key;
  } else {	/* если такой ключ уже есть, конкатенирум инрементный индекс */
    let indexes = matches.map(_key => +( _key.toLowerCase().split(key).pop()) ); // извлекаем все индексы: surname_nameM123 => 123
    let maxNum = Math.max(...indexes); // выбираем максимальный
    let newIndex = maxNum+1; //новый индекс больше на 1
    if(isNaN(newIndex)) throw new Error("personKeyGen: NaN error"); // кинуть исключение если ошибка NaN
    return key+(newIndex); // new key
  }
}

module.exports = {procName, procText};