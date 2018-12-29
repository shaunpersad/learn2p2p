const Codec = require('./src/blocks/components/codec/BlockCodec');
const Storage = require('./src/blocks/components/storage/implementations/filesystem/FilesystemStorage');

const storage = new Storage(); // a place to store generated blocks
const codec = new Codec(storage); // performs data <=> hash conversions

const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';

codec.encode(Codec.createStringStream(content))
    .then(() => {
        return codec.encode(Codec.createStringStream(content));
    })
    .then(hash => {

        storage.createStorageObject().then(output => {

            codec.decode(hash, output.createWriteStream()).then(() => {

                output.createReadStream()
                    .on('data', data => console.log(data.toString()))
                    .on('end', () => output.destroy());
            });
        }).catch(console.log);
    });