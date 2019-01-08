const KVStore = require('./components/kv-store/implementations/memory/MemoryKVStore');
const DHT = require('./implementations/kademlia/KademliaDHT');
const KeyGenerator = require('../utils/KeyGenerator');
const Block = require('../blocks/Block');

const keyGenerator = new KeyGenerator();
let data = '';
let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

for (let i = 0; i < 5000; i++) {
    data += possible.charAt(Math.floor(Math.random() * possible.length));
}


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

        const key = Block.createHash().update(data).digest('hex');

        return dht.kvStore.saveRawValueData(key, data)
            .then(() => {

                if (!process.env.BOOTSTRAP_ADDRESS) {
                    return new Promise((resolve, reject) => {

                        setTimeout(() => {

                            console.log('saving', key);

                            dht.upload(key).then(resolve).catch(reject);

                        }, 10000);
                    })
                        .then(result => console.log(result) || dht.download(key))
                        .then(value => console.log('value', value))
                        .then(() => {

                            return new Promise((resolve, reject) => {

                                let assembled = '';
                                dht.kvStore.createDataReadStream(key)
                                    .on('error', reject)
                                    .on('data', data => {

                                        assembled+= data.toString();
                                    })
                                    .on('end', () => resolve(assembled === data));
                            });
                        })
                        .then(console.log)
                        .catch(err => console.error(err.message));
                }
            });
    });