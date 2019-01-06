const http = require('http');

const KeyGenerator = require('../../utils/KeyGenerator');
const closeServerOnExit = require('../../utils/closeServerOnExit');
const getPublicIP = require('../../utils/getPublicIP');
const getSocket = require('../../utils/getSocket');

const Storage = require('../../blocks/components/storage/implementations/filesystem/FilesystemStorage');
const KVStore = require('../../dht/components/kv-store/implementations/block/BlockKVStore');
const DHT = require('../../dht/implementations/kademlia/KademliaDHT');
const Codec = require('../../blocks/components/codec/Codec');

const fetchHandler = require('./handlers/fetchHandler');
const saveHandler = require('./handlers/saveHandler');

const keyGenerator = new KeyGenerator();
const storage = new Storage();
const kvStore = new KVStore(storage);

keyGenerator.getKeys()
    .then(({ publicKey, privateKey }) => {

        const peer = {
            address: process.env.BOOTSTRAP_ADDRESS,
            port: process.env.BOOTSTRAP_PORT
        };

        const dht = new DHT(kvStore, publicKey, privateKey);
        return dht.bootstrap(peer);
    })
    .then(dht => {

        const codec = new Codec(storage, dht);
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

        server.on('error', err => {
            console.log(err);
            server.close();
        });

        server.listen(socket, () => console.log('Listening on', socket));

        closeServerOnExit(server);
    });