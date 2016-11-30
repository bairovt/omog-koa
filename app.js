const Koa = require('koa');
const arangojs = require('arangojs');
const render = require('koa-swig');
const path = require('path');
const Router = require('koa-router');
const aql = arangojs.aql;

const app = new Koa();
app.context.render = render({
	root: __dirname + '/templates',//path.join(__dirname, 'templates'),
	autoescape: true,
	cache: false, //memory, disable, set to false
	ext: 'html'
	// locals: locals
});

const router = new Router();

const db = new arangojs({
	url: 'http://root:ultra@127.0.0.1:8529',
	databaseName: 'rod'
});


router.get('/', function *(next) {
	// let personsColl = db.collection('Persons');
	// let cursor = yield personsColl.all();
	let cursor = yield db.query(aql`FOR p IN Persons SORT p.fullname RETURN p`);
	let persons = yield cursor.all();
	yield this.render("index", { persons });	
});

// Personal page
router.get('/:_key', function *(next) {
	// let personsColl = db.collection('Persons');
	// let person = yield personsColl.document(this.params._key);	
	let _id = `Persons/${this.params._key}`;	

	let cursor = yield db.query(
		aql`FOR v, e, p
		    IN 0..100 INBOUND
		    ${_id}
		    GRAPH 'parentGraph'
		    OPTIONS {bfs: true}
		    RETURN {person: v, edges: p.edges}`
    );
    //console.log(cursor);
    let ancestors = yield cursor.all(); // ancestors[0] is person
    
    let person = ancestors[0].person;
    // // формируем объект массивов поколений: ключ - глубина колена, значение - массив предков этого колена
    // let gens = ancestors.reduce(function(gens, current, index) {
    // 	if (index == 0) return gens; // игнорируем 0-й элемент (person)
    // 	let i = current.edges.length; // глубина колена текущего предка
    // 	if (typeof gens[i] === 'undefined') gens[i] = []; // инициируем массив предков i-го колена, если его нет
    // 	gens[i].push(cursor.fullname); // добавляем предка в массив предков i-го колена
    // 	return gens;
    // }, {}); // на входе пустой объект
    // let gensCount = Object.keys(gens).length;

	yield this.render("person", { person, ancestors }); //gens, gensCount
});

app.use(router.routes());

app.listen(5000);
console.log('Listening on 5000')