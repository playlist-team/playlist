var express = require('express');
var app = express();


var port = process.env.PORT || 3000;

app.use('/', express.static("./public"));

app.get('/', function (req, res) {
  //res.send('Hello World!');
});

var server = app.listen(port);

var io = require('socket.io').listen(server);

io.on('connection', function(socket){
  socket.on('message', function(data){
    console.log(data);
  })
  socket.on('send', function(data){
    console.log(data);
    io.emit('sent', data);
  })
  socket.on('enqueue', function(data) {
    console.log('YTid:', data);
    io.emit('addVideo', data);
  })
});



