'use strict';

/* Authorization middleware
 checks if a user's role is allowed (roles)
 all forms should use a POST method */

module.exports = function (allowedRoles){
	return async function (ctx, next) {
		let authorized = false;
		let user = ctx.state.user;

		if (!user.roles) ctx.throw(401, 'Unauthorized'); // если нет массива roles

		if (user.isAdmin()) authorized = true;
		else {
			authorized = user.hasRoles(allowedRoles); // проверка наличия ролей у юзера

			// for (let i = 0; i < user.roles.length; i++) {
			// 	authorized = allowedRoles.indexOf(user.roles[i]) != -1; // is authorized, true or false, admin is all allowed
			// 	if (authorized) break;
			// }
		}

		if (!authorized) ctx.throw(401, 'Unauthorized');
		else await next();
	}
};

//todo: добавить тесты на авторизацию