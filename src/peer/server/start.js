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
const args = process.argv.slice(2) || [];
let dhtPort = process.env.DHT_PORT;
let bootstrap = process.env.BOOTSTRAP;
let command = '';
args.forEach((arg, index) => {
    if (!(index % 2)) {
        command = arg;
    } else {
        switch (command) {
            case '-p':
                dhtPort = arg;
                break;
            case '-b':
                bootstrap = arg;
                break;
        }
    }
});

keyGenerator.getKeys()
    .then(({ publicKey, privateKey }) => {

        const dht = new DHT(kvStore, publicKey, privateKey, dhtPort || null);
        const [ address, port ] = (bootstrap || '').split(':');

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