'use strict';

//const config = require('config');
const db = require('modules/arangodb');

module.exports = function* (email, password, self) {
    let Person = db.collection('Person');
    let users = yield db.query(`SELECT @rid, role.code, login FROM User WHERE login='${login}' AND password='${password}' LIMIT 1`);
    let user = users[0];
    if (user) {
        self.session._key = user.rid.toString();
        self.session.urole = user.role;
        self.session.login = user.login;

        self.redirect(self.session.referer || '/user/profile'); // todo: зачем это?
    } else {
        self.redirect('/user/login');
    }
};