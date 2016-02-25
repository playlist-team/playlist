var express = require('express');
var app = express();

var port = process.env.PORT || 3000;

app.use('/', express.static('./Public'));

var server = app.listen(port);

var io = require('socket.io').listen(server);

// var io = require('socket.io')({
//   transports: ["xhr-polling"],
//   'polling duration': 10
// }).listen(server);

var users = {};
var queue = [];
var current;
var start;
var sync;
var set = false;
var switched = false;

io.on('connection', function (socket) {

  socket.on('setUser', function (username) {
    users[socket.id] = username;
  });

  socket.on('getQueue', function() {
    io.sockets.connected[socket.id].emit('sendQueue', queue);
  })

  socket.on('getCurrent', function() {
    if (current) {
      io.sockets.connected[socket.id].emit('sendCurrent', current);
    }
  })

  socket.on('getTime', function() {
    io.sockets.connected[socket.id].emit('sendTime', start);
  })

  socket.on('sendMessage', function (data) {
    io.emit('messageSent', data);
  })

  socket.on('enqueue', function (data) {
    if (current) {

      queue.push(data);
      io.emit('addVideo', data);

    } else {
      set = false;
      current = data;
      io.emit('firstVideo', data);
    }
  })

  socket.on('dequeue', function (data) {
    var id = socket.id;
    if (id.slice(2) === data.socket) {
      io.emit('removeVideo', data.id);
    }
  })

  socket.on('updateQueue', function (data) {
    queue = data;
    socket.broadcast.emit('refreshQueue', queue);
  })

  socket.on('videoEnded', function () {
    if (!switched) {
      switched = true;
      set = false;
      current = queue.shift();
      io.emit('nextVideo', current);
      io.emit('refreshQueue', queue);
      setTimeout(function() {
        switched = false;
      }, 5000);
    }
  })

  socket.on('skip', function() {
    var id = socket.id;
    if (id.slice(2) === current.socket) {
      if (queue.length) {
        switched = true;
        set = false;
        current = queue.shift();
        io.emit('nextVideo', current);
        io.emit('refreshQueue', queue);

        setTimeout(function() {
          switched = false;
        }, 5000);

        set = true;
        clearInterval(sync);
        start = 0;
        sync = setInterval(function() {
          start++;
        }, 1000);
      } else {
        current = null;
        io.emit('stopVideo');
        io.emit('refreshQueue', queue);
      }
    }
  })

  socket.on('setDuration', function (data) {
    if (!set) {
      set = true;
      start = data;
      clearInterval(sync);
      sync = setInterval(function() {
        start++;
      }, 1000);
    }
  });
});


