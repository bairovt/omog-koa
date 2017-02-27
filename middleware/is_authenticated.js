'use strict';

module.exports = async function (ctx, next){
	if (!ctx.session.user && ctx.request.url != '/login') ctx.redirect('/login');
	// set state of request
	ctx.state.user = ctx.session.user;
	await next();
};
