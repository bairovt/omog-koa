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
    corsOrigin: 'http://localhost:8080',
    db: {
      URL: 'http://127.0.0.1:8529',
      user: 'rod_base_user',
      password: 'rod_base_pass'
    },
    uploadDir: '/home/tumen/vuejs/vrodu.su/static/upload'
};
