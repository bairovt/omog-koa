'use strict';
const Koa = require('koa');
const config = require('config');
const session = require('koa-session');
const render = require('koa-swig');
const co = require('co');
const path = require('path');
const Router = require('koa-router');
const koaStatic = require('koa-static');
const logger = require('koa-logger');
const convert = require('koa-convert');
const ROOT = config.get('root');
const cors = require('middleware/cors');

const app = new Koa();
app.keys = config.get('secretKeys');
/* middle wares */
if (app.env === 'development') app.use(cors); // use cors to allow requests from localhost:8080 in development
if (app.env !== 'production') app.use(convert(koaStatic(path.join(ROOT,'public')))); // статика, кроме production
if (app.env === 'development') app.use(convert(logger())); // логгер на деве
app.context.render = co.wrap(render(config.get('swig'))); // подключение шаблонизатора swig
app.use(require('middleware/errors')); // обработка ошибок
app.use(convert(session(config.get('session'), app))); // инициализация сессий
app.use(require('koa-bodyparser')());

/* free api routes */
const freeApiRouter = new Router();
freeApiRouter.use('/free-api', require('routes/free-api'));
app.use(freeApiRouter.routes());

/* authentication middleware */
app.use(require('middleware/is_authenticated')); // проверка аутентификации, обязателена для всех роутов
app.use(require('middleware/set-state.js')); // set state of the request

/* api routing */
const apiRouter = new Router();
apiRouter
    .use('/api/sign', require('routes/api/sign'))
    .use('/api/rod', require('routes/api/rod'))
    .use('/api/person', require('routes/api/person'));
app.use(apiRouter.routes());
    // .use(apiRouter.allowedMethods());

/* main routing */
const router = new Router();
router
    .use('/rod', require('routes/rod'))
    .use('/person', require('routes/person'))
    .use('/sign', require('routes/sign'))
    // .get('/sign/in', async function (ctx, next) {return console.log('тут sign')})
    .get('/', async function (ctx, next) {ctx.redirect('/rod/all');});
app.use(router.routes());
      // .use(apiRouter.allowedMethods());


/* start koa server */
if (module.parent) {
    module.exports = app;
} else {
    let port = config.server.port;
    app.listen(port);
    console.log(`ROD.SO listening on port ${port}`)
}