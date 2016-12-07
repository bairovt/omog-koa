'use strict';
const path = require('path');
const filters = require('./swig-filters');


module.exports = {
    root: path.join(__dirname, '..', 'templates'),
    autoescape: true,
    cache: 'memory', // disable, set to false
    ext: 'html',
    //locals: locals,
    filters: filters
    //tags: tags,
    //extensions: extensions
};
