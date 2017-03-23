'use strict';

module.exports = async function (ctx, next){
	/* authentication is required for all routes */
	if (ctx.session.user_key || ctx.request.url === '/sign/in' || ctx.request.url === '/api/sign/in') await next();
	else return ctx.redirect('/sign/in');
};
