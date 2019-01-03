const stun = require('stun');

const {
    STUN_BINDING_REQUEST,
    STUN_ATTR_XOR_MAPPED_ADDRESS,
    STUN_EVENT_BINDING_RESPONSE,
} = stun.constants;

const stunServers = [
    {
        address: 'stun.l.google.com',
        port: 19302
    },
    {
        address: 'stun1.l.google.com',
        port: 19302
    },
];

function getResponse(server) {

    const { port, address } = stunServers.pop();

    const request = stun.createMessage(STUN_BINDING_REQUEST);

    server.send(request, port, address);

}

function getPublicIp() {

    const server = stun.createServer();

    server.on(STUN_EVENT_BINDING_RESPONSE, stunMsg => {

        console.log(stunMsg.getAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS).value);

        if (stunServers.length) {
            getResponse(server);
        }
    });


    getResponse(server);
}

module.exports = getPublicIp;