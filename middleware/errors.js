'use strict';

/* error handler */
module.exports = async function (ctx, next) {
    try {
        await next();
    } catch (err){
        if (err.status) ctx.throw(err.status, err.message);
        else if (err.name == 'ValidationError') {
            ctx.throw(400, err.message);
        }
        else if (err.name == 'ArangoError') {
            if (err.code == 404) ctx.throw(404); // document not found
            else ctx.throw(500, err.name + ': ' + err.message);
        }
        else {
            ctx.status = 500;
            ctx.body = "Ошибка на сервере. Отправлено уведомление администратору";
            // console.error(err.message, err.stack);
            console.error(err.name, err.message, err);
        }
    }
};
