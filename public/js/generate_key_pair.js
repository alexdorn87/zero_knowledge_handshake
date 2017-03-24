generateKeys = function () {
  var keySize = 4096;
  var crypt = new JSEncrypt({ default_key_size: keySize });
  var dt = new Date();
  var time = -(dt.getTime());
  crypt.getKey();
  dt = new Date();
  time += (dt.getTime());
  $('#privkey').val(crypt.getPrivateKey());
  $('#pubkey').val(crypt.getPublicKey());
};