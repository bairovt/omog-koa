'use strict';
const path = require('path');
const root = process.cwd();

module.exports = {
    // secret data can be moved to env variables
    // or a separate config
    secretKeys: ['super creazy secret key'],
    root: root,
    server: {
        port: 8001
    },
    env: 'development',
    corsOrigin: 'http://localhost:8080'
};