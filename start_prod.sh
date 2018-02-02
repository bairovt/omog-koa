#!/bin/bash
export NODE_ENV=production
export NODE_PATH=/home/tumen/nodejs/rod.so
cd /home/tumen/nodejs/rod.so
#node --harmony-async-await main-rod.js &
node rod-server.js > ./log/logs.log &
