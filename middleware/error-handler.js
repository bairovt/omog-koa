'use strict';

/* error handler */
module.exports = async function (ctx, next) {
    try {
        await next();
    } catch (err){
        console.error(err, err.status);
        if (err.status) {
          ctx.status = err.status;
          ctx.body = {
            message: err.message
          }
        }
        else if (err.name === 'ValidationError') {
          ctx.throw(400, err.message);
        }
        else if (err.name === 'ArangoError') {
          switch (err.code){
            case 404: // document not found
              ctx.throw(404);
              break;
            case 409:
              ctx.throw(409, 'haha: ' + err.name + ': ' + err.message);
              break;
            default:
              ctx.throw(500, 'haha: ' + err.name + ': ' + err.message);
              break;
          }
        }
        else {
            ctx.status = 500;
            ctx.body = {
              message: 'Ошибка на сервере. Отправлено уведомление администратору'
            };
            console.error(err);
            // console.error(err.name, err.message, err.stack);
        }
    }
};
