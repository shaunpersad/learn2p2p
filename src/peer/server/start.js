const http = require('http');

const KeyGenerator = require('../../utils/KeyGenerator');
const getPublicIP = require('../../utils/getPublicIP');
const getSocket = require('../../utils/getSocket');

const Storage = require('../../blocks/components/storage/implementations/filesystem/FilesystemStorage');
const KVStore = require('../../dht/components/kv-store/implementations/block-reference/BlockReferenceKVStore');
const DHT = require('../../dht/implementations/kademlia/KademliaDHT');
const Codec = require('../../blocks/components/codec/Codec');

const fetchHandler = require('./handlers/fetchHandler');
const saveHandler = require('./handlers/saveHandler');

const keyGenerator = new KeyGenerator();

Promise.all([
    getPublicIP(),
    keyGenerator.getKeys()
]).then(([ ipAddress, { publicKey, privateKey } ]) => {

    const blockServerPost = process.env.BLOCK_SERVER_PORT || 8080;
    const storage = new Storage();
    const httpAddress = `${ipAddress}:${blockServerPost}`;
    const kvStore = new KVStore(storage, httpAddress);

    console.log('Public IP is', ipAddress);
    console.log('Hosting blocks from', httpAddress);

    return kvStore.host(blockServerPost)
        .then(() => {

            const connection = {
                port: process.env.DHT_PORT
            };
            const bootstrap = {
                address: process.env.BOOTSTRAP_ADDRESS,
                port: process.env.BOOTSTRAP_PORT
            };

            const dht = new DHT(kvStore, publicKey, privateKey);
            return dht.init(connection, bootstrap);
        })
        .then(dht => new Codec(storage, dht));

}).then(codec => {

    const server = http.createServer();
    const socket = getSocket();

    server.on('request', (req, res) => {

        switch(req.method) {
            case 'GET':
                fetchHandler(codec, req, res);
                break;
            case 'POST':
                saveHandler(codec, req, res);
                break;
            default:
                res.statusCode = 501;
                res.end('This operation is not supported.');
                break;
        }
    });

    server.listen(socket, () => console.log('Listening on', socket));
});
