'use strict';

const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const router = require('koa-router')();
const md5 = require('md5');

/* main page */
async function index(ctx, next) {
	let rods = await db.query(aql`FOR rod IN Rods
                                    /*FILTER rod._key == "Sharaid"*/
												RETURN merge(rod,
													{count: FIRST(FOR p IN Persons
													           FILTER p.rod == rod._id
													           COLLECT WITH COUNT INTO length
													           RETURN length)
													})`).then(cursor => cursor.all());
	await ctx.render("main", { rods });
}

async function all(ctx, next) {
    let cursor = await db.query(aql`FOR p IN Persons SORT p.name RETURN p`);
    let persons = await cursor.all();
    await ctx.render("all", { persons });
}

async function getLogin(ctx, next){
    if (ctx.session.user) ctx.redirect('/person/'+ctx.session.user._key);
    ctx.body = await ctx.render('login');
}

async function postLogin(ctx, next){
    // await* authenticate(login, password, this);
    let {email, password} = ctx.request.body;
    let Persons = db.collection('Persons');
    let person = await Persons.firstExample({email});
    if (person && person.password == md5(password)) {
        ctx.session.user = {_key: person._key, _id: person._id, name: person.name, roles: person.roles};
        ctx.redirect('/'); // todo: сделать возврат на запрашиваемую страницу
    }
    ctx.redirect('/login');
}

async function logout(ctx, next){
    ctx.session = null;
    ctx.redirect('/');
}

router
    .get('/', index)
    .get('/login', getLogin)
    .post('/login', postLogin)
    .get('/logout', logout)
    .get('/all', all);

module.exports = router.routes();
