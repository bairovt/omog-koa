'use strict';
const http = require('http'),
      Koa = require('koa'),
      config = require('config'),
      path = require('path'),
      Router = require('koa-router'),
      logger = require('koa-logger'),
      jwt = require('jsonwebtoken'),
      cors = require('./middleware/cors'),
      errorHandler = require('./middleware/error-handler');


const app = new Koa();
// app.keys = config.get('secretKeys');
const secretKey = config.get('secretKeys')[0];
const server = http.createServer(app.callback());

/* middle wares */
app.use(cors); // use cors to allow requests from different origin (localhost:8080 - on dev, rod.so - on prod)
// логгер на деве
// if (app.env === 'development') { app.use(logger()) }
app.use(logger())
app.use(errorHandler); // обработка ошибок
app.use(require('koa-bodyparser')());

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
.on('connection', function(socket) {
  // console.log('Это мое имя из токена: ' + socket.handshake.query.token);
  socket.on('message', function(message) {
    io.emit('message', message)
  })
});

/* authentication middleware */
app.use(require('./middleware/authenticate'));

/* api routing */
const router = new Router();
router
    .use('/api/user', require('./api/user'))
    .use('/api/rod', require('./api/rod'))
    .use('/api/person', require('./api/person'))
    .use('/api/child', require('./api/child'))        // operate with child edges
    .use('/api/upload', require('./api/upload'))
    .use('/api/stat', require('./api/stat'));

app.use(router.routes());

/* start koa server */
if (module.parent) {
  module.exports = app;
} else {
  let port = config.server.port;
  // app.listen(port);
  server.listen(port);
  console.log(`\tomog.me listening on port ${port}`)
}
