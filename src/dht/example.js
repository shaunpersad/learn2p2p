const KVStore = require('./components/kv-store/implementations/memory/MemoryKVStore');
const DHT = require('./implementations/kademlia/KademliaDHT');
const KeyGenerator = require('../utils/KeyGenerator');
const createHash = require('../utils/createHash');

const keyGenerator = new KeyGenerator();
let data = '';
let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

for (let i = 0; i < 5000; i++) {
    data += possible.charAt(Math.floor(Math.random() * possible.length));
}


keyGenerator.getKeys()
    .then(({ publicKey, privateKey }) => {

        const kvStore = new KVStore();
        const dht = new DHT(kvStore, publicKey, privateKey, process.env.DHT_PORT);
        const [ address, port ] = (process.env.BOOTSTRAP || '').split(':');

        return dht.bootstrap({ address, port });
    })
    .then(dht => {

        const key = createHash().update(data).digest('hex');
        let started;

        return dht.kvStore.saveRawValueData(key, data)
            .then(() => {

                if (!process.env.BOOTSTRAP) {
                    return new Promise((resolve, reject) => {

                        setTimeout(() => {

                            console.log('saving', key);
                            started = Date.now();
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
                        .then(() => console.log(Date.now() - started))
                        .catch(err => console.error(err.message));
                }
            });
    });