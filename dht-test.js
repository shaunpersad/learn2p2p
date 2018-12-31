const KVStore = require('./src/dht/components/kv-store/implementations/memory/MemoryKVStore');
const DHT = require('./src/dht/implementations/kademlia/KademliaDHT');
const KeyGenerator = require('./src/utils/KeyGenerator');
const Block = require('./src/blocks/Block');

const keyGenerator = new KeyGenerator();

keyGenerator.getKeys()
    .then(({ publicKey, privateKey }) => {

        const connection = {
            port: process.env.DHT_PORT
        };
        const bootstrap = {
            address: process.env.BOOTSTRAP_ADDRESS,
            port: process.env.BOOTSTRAP_PORT
        };

        const kvStore = new KVStore();
        const dht = new DHT(kvStore, publicKey, privateKey);

        return dht.init(connection, bootstrap);
    })
    .then(dht => {

        const value = `${Math.random()}`;
        const key = Block.createHash().update(value).digest('hex');

        return new Promise((resolve, reject) => {

            setTimeout(() => {

                console.log('saving', key, value);

                dht.save(key, value).then(resolve).catch(reject);

            }, 10000);

        }).then(result => {

            console.log(result);

            return dht.fetch(key);
        }).then(value => console.log('value', value));
    });