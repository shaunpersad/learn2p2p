const crypto = require('crypto');
const HashStore = require('./HashStore');
const Block = require('./Block');

class Codec {

    constructor(settings = {}) {

        this.settings = Object.assign({
            maxDataLength: 65,
            maxNumLinks: 2,
            hashingFn: block => crypto.createHash('md5').update(block.toString()).digest('hex'),
            hashStore: new HashStore()
        }, settings);
    }

    /**
     * Converts a hash to the original string content.
     * It does this by walking the blocks and concatenating their data.
     */
    decode(hash) {

        const { hashStore, hashingFn } = this.settings;

        return hashStore.get(hash) // get the block for this hash
            .then(block => {

                if (hashingFn(block) !== hash) { // confirm the block's integrity
                    throw new Error('Hashes do not match.');
                }

                return Promise.all([
                    Promise.resolve(block.data) // this block's data
                ].concat(
                    block.links.map(hash => this.decode(hash)) // fetch the data from it's links
                ));

            })
            .then(chunks => chunks.join('')); // concatenate them all
    }


    /**
     * Converts a string into a block and returns its hash.
     * It recursively creates links as necessary.
     * This algorithm tries to create as many "data-heavy" blocks as possible,
     * rather than "link-heavy".
     */
    encode(data) {

        const { hashStore, hashingFn, maxDataLength, maxNumLinks } = this.settings;
        const block = new Block(data, maxDataLength);

        /**
         * Populate the block with links if necessary.
         */
        const createLinks = () => {

            let p = Promise.resolve();

            /**
             * If there are chunks of data beyond maxDataLength,
             * let's create links to them.
             */
            if ((data = data.substring(maxDataLength)) && block.links.length < maxNumLinks) {

                p = p.then(() => {

                        /**
                         * If we're not about to create the max link,
                         * create a new link to the current chunk.
                         */
                        if (block.links.length < maxNumLinks - 1) {

                            const linkedBlock = new Block(data, maxDataLength);
                            const hash = hashingFn(linkedBlock);

                            return hashStore.set(hash, linkedBlock);
                        }

                        /**
                         * If we are about to create the max link,
                         * make sure it's a link to a block that represents
                         * the remaining data, rather than the current chunk.
                         */
                        return this.encode(data);
                    })
                    .then(hash => block.links.push(hash))
                    .then(() => createLinks());
            }

            return p;
        };

        return createLinks().then(() => {

            /**
             * Create and save the root hash.
             */
            const hash = hashingFn(block);
            return hashStore.set(hash, block);
        });
    }

    hashes() {
        return this.settings.hashStore.all();
    }
}

module.exports = Codec;
