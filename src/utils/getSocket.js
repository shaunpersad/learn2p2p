const path = require('path');

function getSocket(removeIfFound = false) {

    const socket = process.platform === 'win32'
        ? path.join('\\\\?\\pipe', process.cwd(), 'cli-socket')
        : path.resolve(__dirname, '../../data/private/socket/cli-socket');


    if (removeIfFound) {
        try {
            require('fs').unlinkSync(socket);
        } catch (err) {

        }
    }
    return socket;
}

module.exports = getSocket;