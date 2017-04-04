'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const authorize =require('middleware/authorize');
const utils = require('utils');
const md5 = require('md5');
const {procName, procText, getPerson, createChildEdge} = utils;

/* All persons page */
async function getAllPersonsPage(ctx, next) {
  let cursor = await db.query(aql`FOR p IN Persons SORT p.name RETURN p`);
  let persons = await cursor.all();
  await ctx.render("person/all_persons", { persons });
}

/* Person page */
async function getPersonPage(ctx, next) {
    let key = ctx.params.key;
    if (key === undefined) key = ctx.state.user._key; // если заход на персональную страницу юзера
    //извлечь персону с родом и добавившим
    let person = await db.query(aql`
        FOR p IN Persons
            FILTER p._key == ${key}
            RETURN merge(p, { 
                rod: FIRST(FOR rod IN Rods            
                        FILTER p.rod == rod._id
                        RETURN {name: rod.name, key: rod._key}),
                addedBy: FIRST(FOR added IN Persons
                            FILTER added._id == p.addedBy
                            RETURN {name: added.name, key: added._key})
            })`
        ).then(cursor => cursor.next());
    if (person === undefined) ctx.throw(404); // check existence

    // находим предков персоны
    let ancestors = await db.query(
        aql`FOR v, e, p
            IN 1..100 INBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
        ).then(cursor => cursor.all());

    // находим потомков персоны
    let descendants = await db.query(
        aql`FOR v, e, p
            IN 1..100 OUTBOUND
            ${person._id}
            GRAPH 'childGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
        ).then(cursor => cursor.all());

    await ctx.render("person/person", { person, ancestors, descendants }); //gens, gensCount
    // await ctx.render("person/person", {person_key: person._key}); //gens, gensCount
}

const RELATION = {father: 'отца', mother: 'мать', son: 'сына', daughter: 'дочь'};

async function createPerson(ctx, reltype=null){ //helper function
	const Persons = db.collection('Persons');
	// todo: Валидация данных из формы
	// todo: проверка имени на спецсимволы!!! (разрешены только буквы и "-")
	// name обязательно, surname и midname - нет
	let {surname, name, midname, lifestory, gender=1, maidenName, email, password, rod} = ctx.request.body;
	surname = procName(surname);
	name = procName(name);
	midname = procName(midname);
	lifestory = procText(lifestory);

	let newPerson = {
		// _key: await personKeyGen(surname, name, midname),
		name, surname, midname, lifestory, rod,
		gender: +gender, // 0 or 1
		created: new Date(),
		addedBy: ctx.state.user._id  //кем добавлен,
	};
	// если жен.
	if (reltype === 'mother' || reltype === 'daughter' ) newPerson.gender = 0; //изменить пол на 0
	if (newPerson.gender === 0) newPerson.maidenName = procText(maidenName); //присвоить девичью фамилию

	if (email && password) {
		newPerson.email = email.trim(); // todo: валидация email, password
		newPerson.password = md5(password.trim());
	}

	return await Persons.save(newPerson);
}

async function createPersonGet(ctx, next){
	const rods = await db.query(aql`FOR rod IN Rods RETURN rod`)
			.then(cursor => cursor.all());
	await ctx.render('person/create_person.html', {rods});
}

async function createPersonPost(ctx, next){
	const newPerson = await createPerson(ctx);
	ctx.redirect(`/person/${newPerson._key}`);
}

async function addPersonGet(ctx, next) {
	const {key, reltype} = ctx.params;
	const person = await getPerson(key);
	const rods = await db.query(aql`FOR rod IN Rods RETURN rod`)
			.then(cursor => cursor.all());
	await ctx.render('person/add_person.html', {person, reltype, relation: RELATION[reltype], rods});
}

async function addPerson(ctx, next){
	/* startKey, reltype
		key, startKey - ключ существующего person, к которому добавляем нового person
      reltype: "father", "mother", "son", "daughter" */
	const {key: startKey, reltype} = ctx.params;
	const startPerson = await getPerson(startKey);
	const user = ctx.state.user;
	// проверка санкций: разрешено добавлять либо к себе, либо к своим (addedBy)
	if (startPerson.addedBy === user._id || startPerson._id === user._id) {} //continue
	else ctx.throw(403, "Нет санкций");

	const newPerson = await createPerson(ctx, reltype);

	// create parent edge
	let fromId, toId;
	if (reltype === 'father' || reltype === 'mother' ) {
	   fromId = newPerson._id;
	   toId = startPerson._id;
	} else if (reltype == 'son' || reltype == 'daughter' ) {
	   fromId = startPerson._id;
	   toId = newPerson._id;
	}
	await createChildEdge(ctx, fromId, toId);
	ctx.redirect(`/person/${startKey}`);
}

async function editPersonGet(ctx, next) {
	let {key} = ctx.params;
	let person = await getPerson(key);
	await ctx.render('person/edit_person.html', {person});
}

class PersonData{
	constructor(data){
		this.name = procName(data.name)
	}

}
async function editPersonPost(ctx, next){
	/* startKey, reltype
		key, startKey - ключ существующего person, к которому добавляем нового person
      reltype: "father", "mother", "son", "daughter" */
	const {key} = ctx.params;
	const editPerson = await getPerson(key);
	const user = ctx.state.user;
	// проверка санкций: разрешено изменять либо себя, либо своих (addedBy)
	if (editPerson.addedBy === user._id || editPerson._id === user._id) {} //continue
	else ctx.throw(403, "Нет санкций");
	db.query(aql`FOR p IN Persons FILTER p._key == ${key}
						UPDATE p WITH {}`);
	// const newPerson = await createPerson(ctx, reltype);

	ctx.redirect(`/person/${key}`);
}

async function linkRelationGet(ctx, next){
	let {key, reltype} = ctx.params;
	let person = await getPerson(key);
	await ctx.render('person/link_relation.html', {person, reltype, relation: RELATION[reltype]});
}

async function linkRelationPost(ctx, next){

	//todo: запрос на соединение с чужой персоной
	//todo: запрет указания родителей, если родители уже есть
	//todo: проверка пола

	const user = ctx.state.user;
	let {start_key, end_key, reltype} = ctx.request.body;

	let fromKey = start_key, toKey = end_key; // if reltype: 'son' or 'daughter' (child)
	if (reltype === 'mother' || reltype === 'father') { // if reltype is not child ('mother' or 'father'): reverse direction
		fromKey = end_key;
		toKey = start_key;
	}

	const fromPerson = await getPerson(fromKey);
	const toPerson = await getPerson(toKey);

	//todo: соединение только своих персон (кроме админа и модератора)
	//todo: запрос на соединение персон
	if (fromPerson.addedBy === user._id || fromPerson.addedBy === user._id || user.isAdmin()) {}
	else ctx.throw(403, 'Forbidden: to link Persons added by different users.');

	//todo: запрет указания родителей, если родители уже есть

	await createChildEdge(ctx, fromPerson._id, toPerson._id);
	ctx.redirect(`/person/${start_key}`);
}

async function removePerson(ctx, next) { // key
	/* правильное удаление Person (вершины графа удалять вместе со связями) */
	const key = ctx.params.key;
	const user = ctx.state.user; // current user
	/* санкции удаления персон:
	  moderator (все кроме тех, которых добавил админ)
	  manager (только тех, кого добавил сам)
	  user (только тех, кого добавил сам)
*/
	const personsCollection = db.collection('Persons');
	const person = await personsCollection.document(key); //person to remove

	console.log(`person.addedBy: ${person.addedBy}, user._id: ${user._id}`);
//todo: !!! подтверждение удаления
//todo: продумать удалени персоны
//todo: запрет удаления персоны самой себя
	if (person.addedBy === user._id || user.isAdmin() || user.hasRoles(['moderator'])) { // проверка санкций
		// правильное удаление вершины графа
		const childGraph = db.graph('childGraph');
		const vertexCollection = childGraph.vertexCollection('Persons');
		await vertexCollection.remove(key); // todo: test проверка несуществующего ключа
		ctx.redirect('/person/all'); // todo: добавить сообщение об успешном удалении
	} else {
		ctx.throw(403, 'Forbidden');
	}
}

/* /person */
router
   .get('/', getPersonPage)    // своя страница
   .get('/all', getAllPersonsPage)    // своя страница

   .get('/create', authorize(['manager']), createPersonGet)    // страница создания персоны
   .post('/create', authorize(['manager']), createPersonPost)    // создание персоны

   .get('/:key', getPersonPage)    // страница персоны

   .get('/:key/add/:reltype', addPersonGet)   // страница добавления персоны
   .post('/:key/add/:reltype', addPerson)    // обработка добавления персоны
	// .get('/:key/edit', editPersonGet)   // страница изменения персоны
	// .post('/:key/edit', editPersonPost)    // обработка изменения персоны
   .get('/:key/link/:reltype', linkRelationGet)    // своя страница
   .post('/link', linkRelationPost)    // своя страница
   // .use(allow(['manager']))
   .get('/:key/remove', removePerson); //authorize(['moderator', 'manager'])
    

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