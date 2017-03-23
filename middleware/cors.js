const convert = require('koa-convert');
const cors = require('kcors');

module.exports = convert(cors({
  origin: 'http://localhost:8080', // 'Access-Control-Allow-Origin'
  credentials: true, // 'Access-Control-Allow-Credentials'
  maxAge: 86400 // 1 сутки: время (сек), на которые нужно закэшировать разрешение, при последующих вызовах браузер уже не будет делать предзапрос.
}));