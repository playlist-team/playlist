var express = require('express');
var app = express();


var port = process.env.PORT || 3000;

app.use('/', express.static("./public"));

app.get('/', function (req, res) {
  //res.send('Hello World!');
});

var server = app.listen(port);

var io = require('socket.io').listen(server);

//test
var queue = [];

io.on('connection', function(socket){
  socket.on('getQueue', function(){
    io.sockets.connected[socket.id].emit('sendQueue', queue);
  })
  socket.on('send', function(data){
    console.log(data);
    io.emit('sent', data);
  })
  socket.on('enqueue', function(data) {
    console.log('YTid:', data);
    io.emit('addVideo', data);
  })
  socket.on('dequeue', function(data) {
    io.emit('removeVideo', data);
  })
  socket.on('stopVideo', function(data) {
    socket.broadcast.emit('stop', data);
  })
  //test
  socket.on('queuelist', function(data){
    queue = data;
  })
  socket.on('songended', function(){
    io.emit('nextsong', queue.shift());
    io.emit('queues', queue);
  })
});



