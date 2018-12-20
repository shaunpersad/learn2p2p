const Codec = require('./src/codec/Codec');
const MemoryBlockStore = require('./src/block-store/MemoryBlockStore');

const highWaterMark = 65; // the maximum size of each block's data
const maxNumLinks = 2; // the maximum number of links a block can have

const blockStore = new MemoryBlockStore(); // a place to store generated blocks
const codec = new Codec({ maxNumLinks, blockStore }); // performs data <=> hash conversions

const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';
let assembled = '';


Codec.stringStream(content, highWaterMark) // in most cases this will be a file/network stream instead of a string
    .pipe(codec.encoder()) // pipe the contents into our encoder which converts the content into blocks
    .on('data', hash => {
        console.log('root hash:', hash.toString('utf8')) // the hash representing our content
    })
    .pipe(codec.decoder()) // pipe the hash into our decoder
    .on('data', chunk => {
        assembled = chunk.toString('utf8') + assembled; // reassemble our string using each block's data
    })
    .on('end', () => {

        console.log('success:', assembled === content);
        console.log(JSON.stringify(blockStore.blocks, null, 4));
    });