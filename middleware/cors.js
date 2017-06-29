const convert = require('koa-convert');
const cors = require('kcors');
const config = require('config');

module.exports = convert(cors({
  origin: config.get('corsOrigin'), // 'Access-Control-Allow-Origin' http://localhost:8080 or api.rod.so
  credentials: true, // 'Access-Control-Allow-Credentials'
  maxAge: 86400 // 1 сутки: время (сек), на которые нужно закэшировать разрешение, при последующих вызовах браузер уже не будет делать предзапрос.
}));