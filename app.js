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
	ext: 'html',
	// locals: locals
})

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

router.get('/:_key', function *(next) {
	let personsColl = db.collection('Persons');
	let person = yield personsColl.document(this.params._key);	
	yield this.render("person", { person });	
});

app.use(router.routes());

app.listen(5000);
console.log('Listening on 5000')