'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
// const authorize =require('middleware/authorize');
const allow =require('middleware/allow');
const utils = require('utils');
const {nameProc, textProc, personKeyGen, isAdmin, getPerson} = utils;

const router = new Router();

/* Person page */
function* getPersonPage(next) {
    let key = this.params.key;
    if (key === undefined) key = this.session.user.key; // если заход на персональную страницу юзера
    //извлечь персону с родом и добавившим
    let person = yield db.query(aql`
        FOR p IN Persons
            FILTER p._key == ${key}
            RETURN merge(p, { 
                rod: FIRST(FOR rod IN Rod            
                        FILTER p.rod == rod._id
                        RETURN {name: rod.name, key: rod._key}),
                addedBy: FIRST(FOR added IN Persons
                            FILTER added._id == p.addedBy
                            RETURN {name: added.name, key: added._key})
            })`
        ).then(cursor => cursor.next());
    if (person === undefined) this.throw(404); // check existence

    // находим предков персоны
    let ancestors = yield db.query(
        aql`FOR v, e, p
            IN 1..100 INBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
        ).then(cursor => cursor.all());

    // находим потомков персоны
    let descendants = yield db.query(
        aql`FOR v, e, p
            IN 1..100 OUTBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
        ).then(cursor => cursor.all());

    yield this.render("person/person", { person, ancestors, descendants }); //gens, gensCount
}

const RELATION = {father: 'отца', mother: 'мать', son: 'сына', daughter: 'дочь'};

function* addPersonGet(next) {
	let {key, reltype} = this.params;
	let person = yield getPerson(key);
	yield this.render('person/add_person.html', {person, reltype, relation: RELATION[reltype]});
}

function* addPersonPost(next){ //key, reltype
	// key - ключ существующего person, к которому добавляем нового person
   // reltype: "father", "mother", "son", "daughter"
	const Persons = db.collection('Persons');
	const Child = db.edgeCollection('child');
	const {key, reltype} = this.params;
	const person = yield getPerson(key);

	// todo: Валидация формы
	// проверка имени на спецсимволы!!! (разрешены только буквы и "-")
	// name обязательно, surname и midname - нет
	let {surname, name, midname, lifestory} = this.request.body;
	surname = nameProc(surname);
	name = nameProc(name);
	midname = nameProc(midname);
	lifestory = textProc(lifestory);
	let fullname = `${surname} ${name} ${midname}`;
	let gender = 1;

	let created = new Date();
	let newPerson = {
		_key: yield personKeyGen(fullname),
	   name, surname, midname, fullname, lifestory, gender, created,
	   addedBy: this.session.user.id  //кем добавлен
	};
	// если жен.
	if (reltype == 'mother' || reltype == 'daughter' ) {
	   newPerson.gender = 0;                                //изменить пол на 0
	   newPerson.maidenName = this.request.body.maidenName; //добавить девичью фамилию
	}
	yield Persons.save(newPerson);
	// create parent edge
	let from, to;
	if (reltype == 'father' || reltype == 'mother' ) {
	   from = 'Persons/' + newPerson._key;
	   to = 'Persons/' + key;
	} else if (reltype == 'son' || reltype == 'daughter' ) {
	   from = 'Persons/' + key;
	   to = 'Persons/' + newPerson._key;
	}

	let childEdge = {
	   created,
	   addedBy: this.session.user.id
	};
	yield Child.save(childEdge, from, to);
	this.redirect(`/person/${key}`);
}

function* linkRelationGet(){
	let {key, reltype} = this.params;
	let person = yield getPerson(key);
	yield this.render('person/link_relation.html', {person, reltype, relation: RELATION[reltype]});
}

function* linkRelationPost(){
	//todo: соединение только своих персон (кроме админа и модератора)
	//todo: запрос на соединение с чужой персоной
	//todo: запрет указания родителей, если родители уже есть
	//todo: проверка пола

	let {start_key, end_key, reltype} = this.request.body;

	let from = start_key, to = end_key; // if reltype: 'son' or 'daughter' (child)
	if (reltype == 'mother' || reltype == 'father') { // reverse direction (parent)
		from = end_key;
		to = start_key;
	}

	const fromPerson = yield getPerson(from);
	const toPerson = yield getPerson(to);

	const Child = db.edgeCollection('child');
	let childEdge = {
		created: new Date(),
		addedBy: this.session.user.id
	};
	console.log(`from: ${from}, to: ${to}, reltype: ${reltype}`);
	yield Child.save(childEdge, fromPerson._id, toPerson._id);
	this.redirect(`/person/${start_key}`);
}

/* правильное удаление Person (вершины графа удалять вместе со связями) */
function* removePerson(next) { // key
    const key = this.params.key;
    const user = this.session.user; // current user
    /* санкции удаления персон:
        moderator (все кроме тех, которых добавил админ)
        manager (только тех, кого добавил сам)
        user (только тех, кого добавил сам)
     */
		const personsCollection = db.collection('Persons');
		const person = yield personsCollection.document(key); //person to remove

		console.log(`person.addedBy: ${person.addedBy}, user._id: ${user.id}`);

		if (person.addedBy === user.id || isAdmin(user)) {
			// правильное удаление вершины графа
			const childGraph = db.graph('childGraph');
			const vertexCollection = childGraph.vertexCollection('Persons');
			yield vertexCollection.remove(key); // todo: добавить обработку исключения неверного ключа
			this.redirect('/all'); // todo: добавить сообщение об успешном удалении
		} else {
			this.throw(403, 'Forbidden');
		}
}

/* /person */
router
   .get('/', getPersonPage)    // своя страница
   .get('/:key', getPersonPage)    // страница персоны
   .get('/:key/add/:reltype', addPersonGet)   // страница добавления персоны
   .post('/:key/add/:reltype', addPersonPost)    // обработка добавления персоны
	.get('/:key/link/:reltype', linkRelationGet)    // своя страница
	.post('/link', linkRelationPost)    // своя страница
   // .use(allow(['manager']))
   .get('/:key/remove', allow(['moderator', 'manager']), removePerson);
    

module.exports = router.routes();


/* // формируем объект массивов поколений: ключ - глубина колена, значение - массив предков этого колена
let gens = ancestors.reduce(function(gens, current, index) {
 if (index == 0) return gens; // игнорируем 0-й элемент (person)
 let i = current.edges.length; // глубина колена текущего предка
 if (typeof gens[i] === 'undefined') gens[i] = []; // инициируем массив предков i-го колена, если его нет
 gens[i].push(cursor.fullname); // добавляем предка в массив предков i-го колена
 return gens;
}, {}); // на входе пустой объект
let gensCount = Object.keys(gens).length;
 */