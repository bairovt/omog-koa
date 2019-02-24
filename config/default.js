'use strict';
const path = require('path');
const root = process.cwd();

module.exports = {
  // secret data can be moved to env variables
  // or a separate config
  secretKeys: ['super creazy secret key'],
  root: root,
  server: {
    port: 8000
  },
  env: 'development',
  corsOrigin: 'http://localhost:8080',
  db: {
    URL: 'http://127.0.0.1:8529',
    name: 'omog_database_name',
    user: 'omog_database_user',
    password: 'omog_database_pass'
  },
  uploadDir: '/home/tumen/vuejs/omog-vue/public/upload',
  mailer: {
    user: 'mail@omog.info',
    pass: 'password'
  }
};
