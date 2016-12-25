'use strict';
const Koa = require('koa');
const config = require('config');
const session = require('koa-session');
const render = require('koa-swig');
const path = require('path');
const Router = require('koa-router');
const ROOT = config.get('root');

const app = new Koa();
app.keys = config.get('secretKeys');
/* middle wares */
if (app.env !== 'production') app.use(require('koa-static')(path.join(ROOT,'public'))); // статика, кроме production
if (app.env == 'development') app.use(require('koa-logger')()); // логгер на деве
app.context.render = render(config.get('swig')); // подключение шаблонизатова swig
app.use(require('middleware/errors')); // обработка ошибок
app.use(session(config.get('session'), app)); // инициализация сессий
app.use(require('koa-bodyparser')());
/* routing */
const router = new Router();
router.use(require('middleware/is_authenticated')); // проверка аутентификации, обязателена для всех роутов
router
    .use(require('routes/main'))
    .use('/rod', require('routes/rod'))
    .use('/person', require('routes/person'));

app.use(router.routes());

// start koa server
if (module.parent) {
    module.exports = app;
} else {
    let port = config.server.port;
    app.listen(port);
    console.log(`ROD.SO listening on port ${port}`)
}