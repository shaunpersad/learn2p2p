const Codec = require('./src/blocks/codec/BlockCodec');
const Storage = require('./src/blocks/storage/implementations/memory/MemoryStorage');

const storage = new Storage(); // a place to store generated blocks
const codec = new Codec(storage); // performs data <=> hash conversions

const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';

codec.encode(Codec.createStringStream(content))
    .then(hash => {

        const storageObject = storage.createStorageObject();

        codec.decode(hash, storageObject.createWriteStream()).then(() => {

            storageObject.createReadStream().on('data', data => console.log(data.toString()));
        });
    });