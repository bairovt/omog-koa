'use strict';
const Koa = require('koa');
const config = require('config');
const session = require('koa-session');
const co = require('co');
const path = require('path');
const Router = require('koa-router');
const logger = require('koa-logger');
const convert = require('koa-convert');
const cors = require('middleware/cors');

const app = new Koa();
app.keys = config.get('secretKeys');
/* middle wares */
app.use(cors); // use cors to allow requests from different origin (localhost:8080 - on dev, api.rod.so - on prod)
if (app.env === 'development') {
  app.use(logger()); // логгер на деве
}
app.use(require('middleware/error-handler')); // обработка ошибок
app.use(require('koa-bodyparser')());

/* free api routes */
// const freeApiRouter = new Router();
// freeApiRouter.use('/free-api', require('routes/free-api'));
// app.use(freeApiRouter.routes());

/* authentication middleware */
app.use(require('middleware/authenticate'));

/* api routing */
const apiRouter = new Router();
apiRouter
    .use('/api/user', require('routes/api/user'))
    .use('/api/rod', require('routes/api/rod'))
    .use('/api/person', require('routes/api/person'));
app.use(apiRouter.routes());

/* start koa server */
if (module.parent) {
    module.exports = app;
} else {
    let port = config.server.port;
    app.listen(port);
    console.log(`ROD.SO listening on port ${port}`)
}