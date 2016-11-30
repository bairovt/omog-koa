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

	// находим предков персоны
	let ancestorsCursor = yield db.query(
		// начинаем с 0 чтобы не делать еще 1 запрос для получения person
		aql`FOR v, e, p
		    IN 0..100 INBOUND
		    ${_id}
		    GRAPH 'parentGraph'
		    OPTIONS {bfs: true}
		    RETURN {person: v, edges: p.edges}`
    );
    
    let ancestors = yield ancestorsCursor.all(); // ancestors[0] is person
    
    let person = ancestors[0].person; //извлекаем персону
    ancestors.splice(0, 1); // удалить персону из массива предков

    // находим потомков персоны
    let descendantsCursor = yield db.query(
		// начинаем с 0 чтобы не делать еще 1 запрос для получения person
		aql`FOR v, e, p
		    IN 1..100 OUTBOUND
		    ${_id}
		    GRAPH 'parentGraph'
		    OPTIONS {bfs: true}
		    RETURN {person: v, edges: p.edges}`
    );

    let descendants = yield descendantsCursor.all()

    // // формируем объект массивов поколений: ключ - глубина колена, значение - массив предков этого колена
    // let gens = ancestors.reduce(function(gens, current, index) {
    // 	if (index == 0) return gens; // игнорируем 0-й элемент (person)
    // 	let i = current.edges.length; // глубина колена текущего предка
    // 	if (typeof gens[i] === 'undefined') gens[i] = []; // инициируем массив предков i-го колена, если его нет
    // 	gens[i].push(cursor.fullname); // добавляем предка в массив предков i-го колена
    // 	return gens;
    // }, {}); // на входе пустой объект
    // let gensCount = Object.keys(gens).length;

	yield this.render("person", { person, ancestors, descendants }); //gens, gensCount
});

app.use(router.routes());

app.listen(5000);
console.log('Listening on 5000')