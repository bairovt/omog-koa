const Koa = require('koa');
const arangojs = require('arangojs');
const render = require('koa-swig');
const path = require('path');

const app = new Koa();
app.context.render = render({
	root: __dirname + '/templates',//path.join(__dirname, 'templates'),
	autoescape: true,
	cache: false, //memory, disable, set to false
	ext: 'html',
	// locals: locals
})

const db = new arangojs({
	url: 'http://root:ultra@127.0.0.1:8529',
	databaseName: 'rod'
});


app.use(function *(next) {
	let personsColl = db.collection('Persons');
	let cursor = yield personsColl.all();
	let persons = yield cursor.all();
	yield this.render("index", { persons: 'bla' });
	// yield this.render("layout.html");
});

app.listen(3000);
console.log('Listening on 3000')