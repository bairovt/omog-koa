'use strict';

/* error handler */
module.exports = function* (next) {
    try {
        yield next;
    } catch (err){
        if (err.status) this.throw(err.status, err.msg);
        else {
            console.error(err);
        }
    }
};
