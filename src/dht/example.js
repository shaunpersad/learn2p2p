const KVStore = require('./components/kv-store/implementations/memory/MemoryKVStore');
const DHT = require('./implementations/kademlia/KademliaDHT');
const KeyGenerator = require('../utils/KeyGenerator');
const Block = require('../blocks/Block');

const keyGenerator = new KeyGenerator();

keyGenerator.getKeys()
    .then(({ publicKey, privateKey }) => {

        const peer = {
            address: process.env.BOOTSTRAP_ADDRESS,
            port: process.env.BOOTSTRAP_PORT
        };

        const kvStore = new KVStore();
        const dht = new DHT(kvStore, publicKey, privateKey, process.env.DHT_PORT);

        return dht.bootstrap(peer);
    })
    .then(dht => {

        const data = `${Math.random()}`;
        const key = Block.createHash().update(data).digest('hex');

        return dht.kvStore.saveRawValueData(key, data)
            .then(() => {

                return new Promise((resolve, reject) => {

                    setTimeout(() => {

                        console.log('saving', key, data);

                        dht.upload(key).then(resolve).catch(reject);

                    }, 10000);
                });
            })
            .then(result => console.log(result) || dht.download(key))
            .then(value => console.log('value', value));

    });