'use strict';
const fs = require('fs');
const config = require('config');
const promisify = require('util').promisify;
const path = require('path');
// https://github.com/koajs/koa/wiki/Error-Handling
// https://github.com/koajs/koa/blob/master/docs/api/context.md#ctxthrowstatus-msg-properties
// todo: перенаправить лог ошибок в production на почту
const writeFile = promisify(fs.writeFile)
// const stat = promisify(fs.stat) // todo: log dir check existance

const root = config.get('root');
/* error handler */
module.exports = async function (ctx, next) {
  try {
    await next();
  } catch (error) {
    // todo: email errors

    if (error.status) {
      await logError(error.status, ctx, error);
      ctx.status = error.status;
      return ctx.body = {
        errorMsg: error.message
      }
    } else if (error.name) {
      switch (error.name) {
        case 'JsonWebTokenError':
          await logError(401, ctx, error);
          ctx.status = 401;
          return ctx.body = {
            errorMsg: 'invalid_token'
          }
        case 'ValidationError':
          await logError(400, ctx, error);
          ctx.status = 400;
          return ctx.body = {
            errorMsg: error.message
          }
          // return ctx.body = {
          //   errorMsg: error.details
          // }
        case 'ArangoError':
          switch (error.code) {
            case 404: // ArangoError
              await logError(404, ctx, error);
              ctx.status = 404;
              return ctx.body = {
                errorMsg: 'db: document not found'
              }
          }
      }
    } else if (error.code) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE': // koa-multer
          await logError(400, ctx, error);
          ctx.status = 400;
          return ctx.body = {
            errorMsg: 'file_size_exceeded'
          }
      }
    }
    await logError(500, ctx, error);
    ctx.status = 500;
    return ctx.body = {
      errorMsg: 'server_error'
    }
  }
};

async function logError(status, ctx, error) {
  const error_log = ctx.request.method + ' ' + ctx.request.href +
    '\n=====ctx.state\n' + JSON.stringify(ctx.state, null, 2) +
    '\n=====ctx.req.headers\n' + JSON.stringify(ctx.req.headers, null, 2) +
    '\n=====ctx.request.body\n' + JSON.stringify(ctx.request.body, null, 2) +
    '\n=====error.name\n' + error.name +
    '\n=====error.status\n' + error.status +
    '\n=====error.code\n' + error.code +
    '\n=====error.message\n' + error.message +
    '\n=====error.stack\n' + error.stack;
  await writeFile(path.join(root, 'log', Date.now() + '_' + status + '.error'), error_log);
  if (process.env.NODE_ENV == 'development') console.error(error_log);
}
