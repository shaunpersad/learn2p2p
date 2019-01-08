const { Writable } = require('stream');
const StringStream = require('../utils/StringStream');
const Codec = require('./components/codec/Codec');
const Storage = require('./components/storage/implementations/filesystem/FilesystemStorage');

const storage = new Storage(); // a place to store generated blocks
const codec = new Codec(storage); // performs data <=> hash conversions

const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';
let assembled = '';

codec.encode(new StringStream(content))
    .then(hash => {

        console.log('hash', hash);


        return codec.decode(hash, new Writable({
            write(chunk, encoding, callback) {
                assembled+= chunk;
                callback();
            }
        })).then(() => assembled);
    })
    .then(console.log)
    .then(() => console.log('correct:', assembled === content))
    .catch(console.log);