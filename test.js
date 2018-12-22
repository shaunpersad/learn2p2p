const Kademlia = require('./src/network/Kademlia');

const kad = new Kademlia();

kad.init().catch(console.log);