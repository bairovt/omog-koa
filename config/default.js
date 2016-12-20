'use strict';

const root = process.cwd();

module.exports = {
    // secret data can be moved to env variables
    // or a separate config
    secret: 'super creazy secret key',
    root: root,
    server: {
        port: 8001
    }
};