var crypto = require('crypto');
var ursa = require('ursa');

var KEY_BITS = 4096;
var PBKDF2_SALT_BITS = 256;
var PBKDF2_ITERATIONS = 20000;
var PBKDF2_LENGTH_BITS = 256;
var masterkeys = [
  {validate_val:"7YIsxlDRpg==", masterkey:"7YIsxlDRpg=="}
];

function encrypt(key, data) {
  var cipher = crypto.createCipher('aes-256-ctr', key);
  var crypted = cipher.update(data, 'utf-8', 'base64');
  crypted += cipher.final('base64');

  return crypted;
}

function decrypt(key, data) {
  var decipher = crypto.createDecipher('aes-256-ctr', key);
  var decrypted = decipher.update(data, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}

module.exports = function (io) {
  io.sockets.on('connection', (socket) => {
    console.log('user connected')


    var key = "3955bf2683504fe14fb0cbf50483efeb6931af4ea6d21b7e98c226232c9bed24";
    var text = "virtuba";
    console.log("Original Text: " + text);

    var encryptedText = encrypt(key, text);
    console.log("Encrypted Text: " + encryptedText);
    var decryptedText = decrypt(key, encryptedText);
    console.log("Decrypted Text: " + decryptedText);
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
      //privateKey.setOptions({encryptionScheme: 'pkcs1'});
      console.log ('server private key : ');
      console.log (socket.server_keypair.toPrivatePem('utf8'));
      var i = 0;
      var decipher;
      socket.client_hashinfo = privateKey.decrypt(hash_info.hash_val, 'base64', 'utf8', ursa.RSA_PKCS1_PADDING);
      console.log ('decrypted client hash value');
      console.log (socket.client_hashinfo);

      //decipher = crypto.createDecipher('aes-256-cbc', socket.client_hashinfo);
      for (; i < masterkeys.length; i++) {
        console.log ("validate_val : ");
        console.log (masterkeys[i].validate_val);
        var t = decrypt(socket.client_hashinfo, masterkeys[i].validate_val);
        console.log ("decrypted value");
        console.log (t);
        if (t == 'virtuba') {
          socket.client_masterkey = decrypt(socket.client_hashinfo, masterkeys[i].masterkey);
          console.log ("user master key");
          console.log (socket.client_masterkey);
          break;
        }
      }
      if (i < masterkeys.length) {
        var client_pubKey = ursa.coercePublicKey(socket.client_pubkey);

        socket.emit('user_masterkey', {encrypted_masterkey: client_pubKey.encrypt(socket.client_masterkey, 'utf8', 'base64', ursa.RSA_PKCS1_PADDING)});
      }
    });

    socket.on('user_session_key', (user_session_key) => {
      console.log ('received user session key: ');
      console.log (user_session_key);
      var privateKey = ursa.coercePrivateKey(socket.server_keypair.toPrivatePem('utf8'));
      socket.client_sessionkey= privateKey.decrypt(user_session_key, 'base64', 'utf8', ursa.RSA_PKCS1_PADDING);
      console.log ('decrypted user session key : ');
      console.log (socket.client_sessionkey);
      //socket.emit('conn_acknowledge', {svr_pub_key : socket.server_keypair.toPublicPem('utf8')});
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

  });
}