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
const jwt = require('jsonwebtoken');


const app = new Koa();
// app.keys = config.get('secretKeys');
const secretKey = config.get('secretKeys')[0];
const server = require('http').createServer(app.callback());


/* middle wares */
app.use(cors); // use cors to allow requests from different origin (localhost:8080 - on dev, rod.so - on prod)
if (app.env === 'development') {
  app.use(logger()); // логгер на деве
}
app.use(require('middleware/error-handler')); // обработка ошибок
app.use(require('koa-bodyparser')());

/* free api routes */
// const freeApiRouter = new Router();
// freeApiRouter.use('/free-api', require('routes/free-api'));
// app.use(freeApiRouter.routes());

/* socket.io communication */
const io = require('socket.io')(server);
io.use(function(socket, next) {
  try {
    let token = socket.handshake.query.token;
    jwt.verify(token, secretKey)
  } catch (e) {
    // console.error('invalid token', e);
    return next(new Error('not authorised'));
    // socket.disconnect(true);
  }
  next()
})
.on('connection', function(socket){
  // console.log('Это мое имя из токена: ' + socket.handshake.query.token);
  socket.on('message', function(message){
    io.emit('message', message)
  })
});

/* authentication middleware */
app.use(require('middleware/authenticate'));

/* api routing */
const apiRouter = new Router();
apiRouter
    .use('/api/user', require('routes/api/user'))
    .use('/api/rod', require('routes/api/rod'))
    .use('/api/person', require('routes/api/person'));
    // .use('/api/messages', require('routes/api/messages'));
app.use(apiRouter.routes());

/* start koa server */
if (module.parent) {
  module.exports = app;
} else {
  let port = config.server.port;
  // app.listen(port);
  server.listen(port);
  console.log(`ROD.SO listening on port ${port}`)
}