const Koa = require('koa');

const app = new Koa();

app.use( ctx => {
	ctx.body = 'Start!'
})

app.listen(3000);