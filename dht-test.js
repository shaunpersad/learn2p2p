const Storage = require('./src/blocks/components/storage/implementations/filesystem/FilesystemStorage');
const KVStore = require('./src/dht/components/kv-store/implementations/block-reference/BlockReferenceKVStore');
const DHT = require('./src/dht/implementations/kademlia/KademliaDHT');
const Codec = require('./src/blocks/components/codec/Codec');
const getPublicIP = require('./src/utils/getPublicIP');
const KeyGenerator = require('./src/utils/KeyGenerator');

const storage = new Storage();
const keyGenerator = new KeyGenerator();

Promise.all([
    keyGenerator.getKeys(),
    getPublicIP()
]).then(([ { publicKey, privateKey }, ipAddress ]) => {

    const blockServerPort = process.env.BLOCK_SERVER_PORT || 8080;
    const connection = {
        port: process.env.DHT_PORT
    };
    const bootstrap = {
        address: process.env.BOOTSTRAP_ADDRESS,
        port: process.env.BOOTSTRAP_PORT
    };

    const kvStore = new KVStore(storage, `${ipAddress}:${blockServerPort}`);
    const dht = new DHT(kvStore, publicKey, privateKey);

    return kvStore.host(blockServerPort).then(() => dht.init(connection, bootstrap));

}).then(dht => {

    const codec = new Codec(storage, dht);
});