#!/bin/sh
export NODE_ENV=development
export NODE_PATH=/home/tumen/nodejs/rod.so
cd /home/tumen/nodejs/rod.so
#node --harmony-async-await main-rod.js &
# node rod-server.js
./node_modules/.bin/nodemon rod-server.js
