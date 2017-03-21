'use strict';
const path = require('path');
const root = process.cwd();
const filters = require('modules/swig-filters');

module.exports = {
    // secret data can be moved to env variables
    // or a separate config
    secretKeys: ['super creazy secret key'],
    root: root,
    server: {
        port: 8001
    },
    session: { //koa-session config
        key: 'koa:sess', /** (string) cookie key (default is koa:sess) */
        maxAge: 10*365*24*3600*1000, /** (number) maxAge in ms (default is 1 days: 86400000) */
        overwrite: true, /** (boolean) can overwrite or not (default true) */
        httpOnly: true, /** (boolean) httpOnly or not (default true) */
        signed: true /** (boolean) signed or not (default true) */
    },
    swig: { //swig config
        root: path.join(root, 'templates'),
        autoescape: true,
        cache: false, //memory, disable, set to false
        ext: 'html',
        filters
        // locals: locals
    },
    env: 'development'
};