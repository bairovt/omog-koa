'use strict';
const Koa = require('koa');
const render = require('koa-swig');
const path = require('path');
const Router = require('koa-router');
const aql = require('arangojs').aql;
const db = require('modules/arangodb')

const app = new Koa();
app.context.render = render({
	root: __dirname + '/templates',//path.join(__dirname, 'templates'),
	autoescape: true,
	cache: false, //memory, disable, set to false
	ext: 'html'
	// locals: locals
});

const router = new Router();

router.get('/', function *(next) {	
	let cursor = yield db.query(aql`FOR p IN Persons SORT p.fullname RETURN p`);
	let persons = yield cursor.all();
	yield this.render("index", { persons });	
});

router.use('/person', require('routes/person'));

app.use(router.routes());

app.listen(5000);
console.log('Listening on 5000')