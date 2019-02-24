'use strict';

module.exports = {
  env: 'development',
  corsOrigin: 'http://localhost:8080',
  db: {
    URL: 'http://127.0.0.1:8529',
    name: 'test_omog',
    user: 'root',
    password: 'ultraplex'
  },
  uploadDir: '/home/tumen/vuejs/omog-vue/public/upload',
  mailer: {
    user: 'mail@omog.me',
    pass: 'agaland'
  }
};
