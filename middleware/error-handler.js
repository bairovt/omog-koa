'use strict';
// https://github.com/koajs/koa/wiki/Error-Handling
// https://github.com/koajs/koa/blob/master/docs/api/context.md#ctxthrowstatus-msg-properties
// todo: перенаправить лог ошибок в production на почту

/* error handler */
module.exports = async function (ctx, next) {
    try {
        await next();
    } catch (error){
        // console.error(error, error.status);
        if (error.status) {
          ctx.status = error.status;
          ctx.body = {
            error: {
              message: error.message
            }
          }
        }
        else if (error.name === 'ValidationError') {
          ctx.throw(400, {
            error: {
              message: error.message
            }
          })
        }
        else if (error.name === 'ArangoError') {
          switch (error.code){
            case 404: // document not found
              ctx.throw(404);
              break;
            case 409:
              ctx.throw(409, 'haha: ' + error.name + ': ' + error.message);
              break;
            default:
              ctx.throw(500, 'haha: ' + error.name + ': ' + error.message);
              break;
          }
        }
        else if (error.name === 'JsonWebTokenError') { // todo: report about possible hijacking atempt
          ctx.status = 401;
          ctx.body = {
            error: {
              message: 'invalid_token'
            }            
          };
        }
        else {
          ctx.status = 500;
          ctx.body = {
            error: {
              message: 'Ошибка на сервере. Отправлено уведомление администратору'
            }
          };
          console.error(error);
          // console.error(err.name, err.message, err.stack);
        }
    }
};
