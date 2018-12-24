class DHT {

    bootstrap(yourAddress, peerAddress = null) {
        throw new Error('Please override the bootstrap(yourAddress, peerAddress = null) method.');
    }

    save(key, value) {
        throw new Error('Please override the save(key, value) method.');
    }

    fetch(key) {
        throw new Error('Please override the fetch(key) method.');
    }
}

module.exports = DHT;
