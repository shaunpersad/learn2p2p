const http = require('http');

function getPublicIP() {

    return new Promise((resolve, reject) => {

        http.get({ host: 'api.ipify.org' }, res => {

            let ip = '';

            res.on('data', chunk => ip+= chunk);
            res.on('error', reject);
            res.on('end', () => resolve(ip));

        }).on('error', reject);
    });
}

module.exports = getPublicIP;
