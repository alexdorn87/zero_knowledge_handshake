var crypto = require('crypto');
var ursa = require('ursa');

var KEY_BITS = 4096;
var PBKDF2_SALT_BITS = 256;
var PBKDF2_ITERATIONS = 20000;
var PBKDF2_LENGTH_BITS = 256;
var masterkeys = [
  {hash:"hash123", masterkey:"sadfjkasldfasdf"}
];

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
      var i = 0;
      var decipher;
      socket.client_hashinfo = privateKey.decrypt(encData, 'base64', 'utf8');
      console.log (socket.client_hashinfo);

      decipher = crypto.createDecipher('aes-256-ctr', socket.client_hashinfo);
      for (; i < masterkeys.length; i++) {
        decipher.update(masterkeys[i].hash, 'base64');
        if (decipher.final('base64') == 'virtuba') {
          decipher.update(masterkeys[i].masterkey, 'base64');
          socket.client_masterkey = decipher.final('base64');
          break;
        }
      }
      var client_pubKey = ursa.coercePublicKey(socket.client_pubkey);

      socket.emit('user_masterkey', {encrypted_masterkey : privateKey.encrypt(socket.client_masterkey, 'utf8', 'base64')});
    });

    socket.on('user_session_key', (user_session_key) => {
      console.log ('received user session key: ');
      console.log (user_session_key);
      var privateKey = ursa.coercePrivateKey(socket.server_keypair.toPrivatePem('utf8'));
      socket.client_sessionkey= privateKey.decrypt(user_session_key, 'base64', 'utf8');
      console.log (socket.client_sessionkey);
      //socket.emit('conn_acknowledge', {svr_pub_key : socket.server_keypair.toPublicPem('utf8')});
    });
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

  });
}