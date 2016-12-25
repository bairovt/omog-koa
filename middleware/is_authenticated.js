'use strict';

module.exports = function* (next){
    if (!this.session.user && this.request.url != '/login') this.redirect('/login');
    yield next;
};
