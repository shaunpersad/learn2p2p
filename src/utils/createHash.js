const crypto = require('crypto');

function createHash() {

    return crypto.createHash('sha256');
}

module.exports = createHash;