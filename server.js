var express = require('express');
var app = express();

var port = process.env.PORT || 3000;

app.use('/', express.static('./Public'));

var server = app.listen(port);

// var io = require('socket.io').listen(server);

var io = require('socket.io')({
  transports: ["xhr-polling"],
  'polling duration': 10
}).listen(server);

var users = {};
var queue = [];
var votes = {};
var upvotes = 0;
var downvotes = 0;
var current;
var start;
var sync;
var set = false;
var switched = false;

io.on('connection', function (socket) {

  socket.on('setUser', function (username) {
    users[socket.id] = username;
    io.sockets.connected[socket.id].emit('usernamewindow', username)
    io.emit('onlineusers', users)
  });

  socket.on('getQueue', function() {
    if (queue.length) {
      io.sockets.connected[socket.id].emit('sendQueue', queue);
    }
  })

  socket.on('getCurrent', function() {
    if (current) {
      io.sockets.connected[socket.id].emit('sendCurrent', current);
    }
  })

  socket.on('getVotes', function() {
    io.sockets.connected[socket.id].emit('sendVotes', {up: upvotes, down: downvotes});
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
      votes = {};
      upvotes = 0;
      downvotes = 0;
      io.emit('clearVotes');
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

  socket.on('easterEgg', function() {
    queue.unshift({ id: 'Gzkkm_m3mVE', 
                    title: 'Meow the Jewels', 
                    username: 'Meow Mode', 
                    socket: current.socket });
    current = queue.shift();
    ended();
  })

  socket.on('videoEnded', function () {
    if (!switched) {
      switched = true;
      set = false;
      current = queue.shift();
      ended();
      setTimeout(function() {
        switched = false;
      }, 5000);
    }
  })

  socket.on('skip', function(easterEgg) {
    var id = socket.id;
    if (id.slice(2) === current.socket || easterEgg) {
      if (queue.length) {
        current = queue.shift();
        ended();
      } else {
        current = null;
        ended();
      }
    }
  })

  socket.on('setDuration', function (data) {
    if (!set) {
      set = true;
      start = data;
      clearInterval(sync);
      sync = setInterval(function() {
        console.log(start);
        start++;
      }, 1000);
    }
  });

  socket.on('disconnect', function () {
    delete users[socket.id];
    io.emit('onlineusers', users)
  });

  socket.on('upVote', function(){
    if (votes[socket.id] === 'down'){
      votes[socket.id] = 'up';
      downvotes--;
      upvotes++;
    }
    if (votes[socket.id] === undefined) {
      votes[socket.id] = 'up';
      upvotes++;
    }
    io.emit('changeVote', {up: upvotes, down: downvotes});
  })

  socket.on('downVote', function(){
    if(votes[socket.id] === 'up'){
      votes[socket.id] = 'down';
      upvotes--;
      downvotes++;
    }
    if(votes[socket.id] === undefined){
      votes[socket.id] = 'down';
      downvotes++;
    }
    io.emit('changeVote', {up: upvotes, down: downvotes});
  })

  socket.on('getSync', function() {
    io.sockets.connected[socket.id].emit('sendSync', start);
  })

  var ended = function () {
  votes = {};
  upvotes = 0;
  downvotes = 0;
  io.emit('clearVotes');
  io.emit('nextVideo', current);
  io.emit('refreshQueue', queue);
};

});


