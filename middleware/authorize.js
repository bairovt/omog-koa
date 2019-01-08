'use strict';

/* Authorization middleware
 checks if a user's role is allowed (roles)
 all forms should use a POST method */

/* проверка наличия ролей у юзера
* */
module.exports = function (allowedRoles){ // array
	return async function (ctx, next) {
		let authorized = false;
		const user = ctx.state.user;

		if (user.isAdmin()) authorized = true;
		else authorized = user.hasRoles(allowedRoles);

		if (authorized) return next();
		else {
			return ctx.throw(403, 'Access denied for user');
    }
	}
};

//todo: добавить тесты на авторизацию
