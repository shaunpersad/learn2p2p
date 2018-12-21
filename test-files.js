const dataDirectory = require('path').resolve(__dirname, './data');
const FileBlockStore = require('./src/block-store/FileBlockStore');

const store = new FileBlockStore(dataDirectory);
let list = null;
store.getHashList()
    .then(hashList => {
        list = hashList;
        return hashList.push('abc');
    })
    .then(hashList => {

        return hashList.push('12345');
    })
    .then(hashList => {

        return hashList.push('one two three');
    })
    .then(hashList => {

        return hashList.pop();
    })
    .then(hash => {

        console.log(hash);

        return list.pop();
    })
    .then(hash => {

        console.log(hash);

        return list.pop();
    })
    .then(hash => {

        console.log(hash);

        return list.destroy();
    });