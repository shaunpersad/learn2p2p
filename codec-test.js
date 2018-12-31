const { Writable } = require('stream');
const Codec = require('./src/blocks/components/codec/Codec');
const Storage = require('./src/blocks/components/storage/implementations/filesystem/FilesystemStorage');

const storage = new Storage(); // a place to store generated blocks
const codec = new Codec(storage); // performs data <=> hash conversions

const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';

codec.encode(Codec.createStringStream(content))
    .then(hash => {

        let assembled = '';

        return codec.decode(hash, new Writable({
            write(chunk, encoding, callback) {
                assembled+= chunk;
                callback();
            }
        })).then(() => assembled);
    })
    .then(console.log)
    .catch(console.log);