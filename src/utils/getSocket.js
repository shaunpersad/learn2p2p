const path = require('path');

function getSocket() {

    return process.platform === 'win32'
        ? path.join('\\\\?\\pipe', process.cwd(), 'cli-socket')
        : path.resolve(__dirname, '../../data/private/socket/cli-socket');
}

module.exports = getSocket;