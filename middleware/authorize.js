'use strict';

// Authorization middleware
// checks if a user's role is allowed (roles)
// all forms should use a POST method

module.exports = function (roles){
    return function* (next) {

        let authorized = roles.indexOf(this.session.urole) != -1; // true or false
        switch (this.method) {
            case 'GET':
                //this.authorized = authorized; // for check: is request authorized
                this.state.authorized  = authorized; // for use in templates, state is merged to templ context
                break;
            case 'POST':
                this.assert(authorized, 403, 'forbidden');
                break;
            default:
                this.throw(400, 'bad request');
        }
        yield* next;
    };
};