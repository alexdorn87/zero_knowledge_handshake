var crypto = require('crypto');
var ursa = require('ursa');

var KEY_BITS = 4096;
var PBKDF2_SALT_BITS = 256;
var PBKDF2_ITERATIONS = 20000;
var PBKDF2_LENGTH_BITS = 256;

module.exports = function (io) {
  io.sockets.on('connection', (socket) => {
    console.log('user connected')

    //socket.emit('userName');

    socket.on('conn_request', (rcv_keypair) => {
      console.log ('received user public key : ');
      console.log (rcv_keypair);
      socket.client_pubkey = rcv_keypair.user_pub_key;
      socket.server_keypair = ursa.generatePrivateKey(KEY_BITS);
      socket.emit('conn_acknowledge', {svr_pub_key : socket.server_keypair.toPublicPem('utf8')});
    });

    socket.on('hash_info', (hash_info) => {
      console.log ('received encrypted user hash_info : ');
      console.log (hash_info);
      var privateKey = ursa.coercePrivateKey(socket.server_keypair.toPrivatePem('utf8'));
      socket.client_hashinfo = privateKey.decrypt(encData, 'base64', 'utf8');
      socket.emit('conn_acknowledge', {svr_pub_key : socket.server_keypair.toPublicPem('utf8')});
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

  });
}