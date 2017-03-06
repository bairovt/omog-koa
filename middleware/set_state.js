'use strict';

module.exports = async function (ctx, next){
	/* set user state of the request */
	if (ctx.request.url !== '/login') {
		ctx.state.user = ctx.session.user;
		ctx.state.user.isAdmin = require('utils').isAdmin; // assign method isAdmin for user
	}
	await next();
};
