const Kademlia = require('./src/dht/Kademlia');

const kad = new Kademlia();

kad.init().catch(console.log);