'use strict';
const Koa = require('koa');
const session = require('koa-session');
const render = require('koa-swig');
const path = require('path');
const Router = require('koa-router');
const aql = require('arangojs').aql;
const db = require('modules/arangodb');
const filters = require('modules/swig-filters');
const bodyparser = require('koa-bodyparser');

const app = new Koa();
app.keys = ['SlvmsKJHksdfSDFaflk'] // config.get('sekret')
// инициализация сессий
var SESSCONFIG = {
  key: 'user:sess', /** (string) cookie key (default is koa:sess) */
  maxAge: 10*365*24*3600*1000, /** (number) maxAge in ms (default is 1 days: 86400000) */
  overwrite: true, /** (boolean) can overwrite or not (default true) */
  httpOnly: true, /** (boolean) httpOnly or not (default true) */
  signed: true, /** (boolean) signed or not (default true) */
};
app.use(session(SESSCONFIG, app));
// подключение шаблонизатова swig
app.context.render = render({
	root: __dirname + '/templates',//path.join(__dirname, 'templates'),
	autoescape: true,
	cache: false, //memory, disable, set to false
	ext: 'html',
    filters
	// locals: locals
});
app.use(bodyparser());

// вход (аутентификация) обязателен для всех роутов
app.use(function* (next){
	console.log('URL: ', this.request.url);
	if (!this.session.user && this.request.url != '/login') this.redirect('/login');	
	yield next;
})

const router = new Router();

// router.use('/', require('routes/main'));
function* main(next) {  
    let cursor = yield db.query(aql`FOR r IN Rod                                        
                                        RETURN r`);
    let rods = yield cursor.all();
    yield this.render("main", { rods });    
};

function* all(next) {  
    let cursor = yield db.query(aql`FOR p IN Persons SORT p.fullname RETURN p`);
    let persons = yield cursor.all();
    yield this.render("all", { persons });    
};

router
    .get('/login', function*(next){
        if (this.session.user) this.redirect('/person/'+this.session.user._key);
        this.body = yield this.render('login');
    })
    .post('/login', function* (next){
        // yield* authenticate(login, password, this);
        let {email, password} = this.request.body;
        console.log(email, password);
        let cursor = yield db.query(aql`FOR p IN Persons FILTER p.email == ${email} RETURN p`);
        let result = yield cursor.all();
        let person = result[0];
        console.log('login person: ', person);

        if (person && person.password == password) {
            this.session.user = person;
            this.redirect('/'); // todo: сделать возврат на запрашиваемую страницу
        }
        this.redirect('/login')        
    })
    .get('/logout', function *(next){
        this.session = null;
        this.redirect('/');
    });

//main router
router    
    .get('/', main)       
    .get('/all', all)    

router.use('/rod', require('routes/rod'));
router.use('/person', require('routes/person'));

app.use(router.routes());

app.listen(5000);
console.log('Listening on 5000')