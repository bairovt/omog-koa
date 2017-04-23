'use strict';

/* Authorization middleware
 checks if a user's role is allowed (roles)
 all forms should use a POST method */

module.exports = function (allowedRoles){
	return async function (ctx, next) {
		let authorized = false;
		const user = ctx.state.user;

		if (user.isAdmin()) authorized = true;
		else authorized = user.hasRoles(allowedRoles); // проверка наличия ролей у юзера

		if (authorized) return next();
		else {
			// return ctx.throw(403, 'Forbidden'); // почему-то не работает
      ctx.status = 403;
      ctx.body = {
        message: 'Forbidden'
      };
    }
	}
};

//todo: добавить тесты на авторизацию