'use strict';

/* error handler */
module.exports = function* (next) {
    try {
        yield next;
    } catch (err){
        if (err.status) this.throw(err.status, err.message);
        else if (err.name == 'ValidationError') {
            this.throw(400, err.message);
        }
        else if (err.name = 'ArangoError') {
            if (err.code == 404) this.throw(404); // document not found
            else this.throw(500, err.name + ': ' + err.message);
        }
        else {
            this.status = 500;
            this.body = "Ошибка на сервере. Отправлено уведомление администратору";
            // console.error(err.message, err.stack);
            console.error(err.name, err.message, err);
        }
    }
};
