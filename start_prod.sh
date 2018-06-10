#!/bin/bash
# export NODE_PATH=/home/tumen/nodejs/rod.so
cd /home/tumen/nodejs/rod.so
export NODE_ENV=production
node rod-server.js > ./log/logs.log &
