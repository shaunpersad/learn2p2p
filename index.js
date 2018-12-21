const Codec = require('./src/codec/Codec');
const Store = require('./src/block-store/FileBlockStore');

const highWaterMark = 65; // the maximum size of each block's data
const maxLinksPerBlock = 2; // the maximum number of links a block can have

const blockStore = new Store(); // a place to store generated blocks
const codec = new Codec({ maxNumLinks: maxLinksPerBlock, blockStore }); // performs data <=> hash conversions

const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';
let assembled = '';
const blocks = {};


Codec.stringStream(content, highWaterMark) // in most cases this will be a file/network stream instead of a string
    .pipe(codec.encoder()) // pipe the contents into our encoder which converts the content into blocks
    .on('data', hash => {
        console.log('root hash:', hash.toString('utf8')) // the hash representing our content
    })
    .pipe(codec.decoder({ readableObjectMode: true })) // pipe the hash into our decoder
    .on('data', block => {
        blocks[block.computedHash] = block;
        assembled+= block.data.toString('utf8'); // reassemble our string using each block's data
    })
    .on('end', () => {

        console.log('success:', assembled === content);
        console.log(JSON.stringify(blocks, null, 4));
    });