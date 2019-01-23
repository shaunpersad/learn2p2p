const http = require('http');

const KeyGenerator = require('../../utils/KeyGenerator');
const closeServerOnExit = require('../../utils/closeServerOnExit');
const getSocket = require('../../utils/getSocket');

const Storage = require('../../blocks/components/storage/implementations/filesystem/FilesystemStorage');
const KVStore = require('../../dht/components/kv-store/implementations/block/BlockKVStore');
const DHT = require('../../dht/implementations/kademlia/KademliaDHT');
const Codec = require('../../blocks/components/codec/Codec');

const DefaultEndpoint = require('./Endpoint');
const FetchEndpoint = require('./endpoints/FetchEndpoint');
const SaveEndpoint = require('./endpoints/SaveEndpoint');

const keyGenerator = new KeyGenerator();
const storage = new Storage();
const kvStore = new KVStore(storage);

keyGenerator.getKeys()
    .then(({ publicKey, privateKey }) => {

        const dht = new DHT(kvStore, publicKey, privateKey, process.env.DHT_PORT);
        const [ address, port ] = (process.env.BOOTSTRAP || '').split(':');

        return dht.bootstrap({ address, port });
    })
    .then(dht => {

        const codec = new Codec(storage);
        const server = http.createServer();
        const socket = getSocket();
        let Endpoint = DefaultEndpoint;

        server.on('request', (req, res) => {

            switch(req.method) {
                case 'GET':
                    Endpoint = FetchEndpoint;
                    break;
                case 'POST':
                    Endpoint = SaveEndpoint;
                    break;
            }

            const endpoint = new Endpoint(codec, dht);
            endpoint.handler(req, res);
        });

        server.on('error', err => {
            console.log(err);
            server.close();
        });

        server.listen(socket, () => console.log('Listening on', socket));

        closeServerOnExit(server);
    });