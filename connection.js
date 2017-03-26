module.exports = function (io) {
  io.sockets.on('connection', (socket) => {
    console.log('user connected')

    socket.emit('userName');

    socket.on('hello', (msg) => {
      console.log('message: ' + msg);
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

  });
}