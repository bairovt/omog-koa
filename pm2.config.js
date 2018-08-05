module.exports = {
  apps : [{
    name      : 'rod',
    script    : './rod-server.js',
    watch: true,
    instance_var: 'INSTANCE_ID',
    env: {
	NODE_ENV: 'production',
	NODE_CONFIG_DIR: '/home/tumen/nodejs/rod.so/config/',
	NODE_PATH: '/home/tumen/nodejs/rod.so'
    },
//    env_production : {
//      NODE_ENV: 'production'
//    }
  }],

/*
  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
*/
};
