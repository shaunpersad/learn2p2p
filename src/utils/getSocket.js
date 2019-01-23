const path = require('path');

function getSocket() {

    const socket = process.platform === 'win32'
        ? path.join('\\\\?\\pipe', process.cwd(), 'cli-socket')
        : path.resolve(__dirname, '../../data/private/socket/cli-socket');

    try {
        require('fs').unlinkSync(socket);
    } catch (err) {

    }
}

module.exports = getSocket;