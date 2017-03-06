'use strict';

module.exports = async function (ctx, next){
	/* authentication is required for all routes */
	if (ctx.session.user || ctx.request.url === '/login') await next();
	else return ctx.redirect('/login');
};
