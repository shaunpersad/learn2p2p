const http = require('http');
const Codec = require('./blocks/components/codec/Codec');
const Storage = require('./blocks/components/storage/implementations/filesystem/FilesystemStorage');
const getSocket = require('./utils/getSocket');
const storage = new Storage();
const codec = new Codec(storage);
const server = http.createServer();

server.on('request', (req, res) => {

    switch(req.method) {
        case 'GET':
            const [ hash ] = req.url.split('/').filter(piece => !!piece);
            if (!hash) {
                res.statusCode = 400;
                return res.end();
            }
            codec.decode(hash, res).catch(err => res.end(err.message));
            break;
        case 'POST':
            codec.encode(req).catch(err => err.message).then(payload => res.end(`File saved with hash: ${payload}`));
            break;
        default:
            res.statusCode = 501;
            res.end();
            break;
    }
});

const socket = getSocket();
server.listen(socket, () => console.log('Listening on', socket));