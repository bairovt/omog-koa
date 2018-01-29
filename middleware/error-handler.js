'use strict';
const fs = require('fs');
const config = require('config');
const promisify = require('util').promisify
const path = require('path');
// https://github.com/koajs/koa/wiki/Error-Handling
// https://github.com/koajs/koa/blob/master/docs/api/context.md#ctxthrowstatus-msg-properties
// todo: перенаправить лог ошибок в production на почту
const writeFile = promisify(fs.writeFile)
// const stat = promisify(fs.stat) // todo: log dir check existance

// todo: log error on production
const root = config.get('root');
/* error handler */
module.exports = async function (ctx, next) {
  try {
    await next();
  } catch (error) {
    if (error.status) {
      ctx.status = error.status;
      return ctx.body = {
        error: {
          message: error.message
        }
      }
    }
    else {
      switch (error.name){
        case 'JsonWebTokenError': // todo: report about possible hijacking atempt
          ctx.status = 401;
          return ctx.body = {
            error: {
              message: 'invalid_token'
            }
          }
        case 'ValidationError':
          ctx.status = 400;
          return ctx.body = {
            error: {
              message: error.message
            }
          }
        case 'ArangoError':
          switch (error.code) {
            case 404: // document not found
              ctx.status = 404;
              return ctx.body = {
                error: {
                  message: 'document_not_found'
                }
              }
          }
      }
    }
    const error_log = ctx.state + '\n=====\n' + ctx.req.headers + '\n=====\n' + error.stack;
    await writeFile(path.join(root, 'log', Date.now() + '_' + '500.error'), error_log);
    if (process.env.NODE_ENV == 'development') console.error('\n=====\n', error.stack);
    ctx.throw(500)
  }
};
