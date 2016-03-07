var express = require('express');

var app = express();

var port = process.env.PORT || 3000;

app.use('/', express.static('./client'));

var server = app.listen(port);

var io = require('socket.io')({
  transports: ["xhr-polling"],
  'polling duration': 10
}).listen(server);
console.log('Listening on ', port)

var users = {};
var queue = [];
var votes = {};
var upvotes = 0;
var downvotes = 0;
var current;
var timeTotal;
var timeLeft;
var sync;
var set;
var switched;

//Helper function to reset the state of clients connected
var reset = function() {
  votes = {};
  upvotes = 0;
  downvotes = 0;
  io.emit('clearVotes');
  io.emit('nextVideo', current);
  io.emit('setQueue', queue);
};

io.on('connection', function(socket) {
  
  //Receives username from client and emits username, socket id, users online back to client
  socket.on('username', function(username) {
    if (!userExist(users, username) || username === 'anonymous'){
      io.emit('activityLog', {username: username, action: "has joined", title: ""});
    }
    users[socket.id] = username;
    io.sockets.connected[socket.id].emit('setUser', username);
    io.sockets.connected[socket.id].emit('setId', socket.id);
    
    io.emit('usersOnline', users);
  });

  //Sends queue information to client
  socket.on('getQueue', function() {
    if (queue.length) {
      io.sockets.connected[socket.id].emit('setQueue', queue);
    }
  });

  //Sends current video to client
  socket.on('getCurrent', function() {
    if (current) {
      io.sockets.connected[socket.id].emit('setCurrent', current);
    } else {
      io.sockets.connected[socket.id].emit('setVolume');
    }
  });

  //Sends vote information for current video to client
  socket.on('getVotes', function() {
    io.sockets.connected[socket.id].emit('changeVotes', {up: upvotes, down: downvotes});
  });

  //Sends video duration to client
  socket.on('getTime', function() {
    io.sockets.connected[socket.id].emit('setTime', timeTotal - timeLeft || timeTotal);
  });

  //Emits message to all clients
  socket.on('sendMessage', function(data) {
    io.emit('chatMessage', data);
  });

  //Emits activity log to all clients
  socket.on('sendLog', function(data) {
    data.username = users[socket.id];
    io.emit('activityLog', data);
  });

  //Emits alert message only to sender
  socket.on('sendAlert', function(data) {
    socket.emit('chatMessage', data);
  });

  //Emits data to only specific client (private message)
  socket.on('privateMessage', function(data){
    io.sockets.sockets[data.sendToSocketId].emit('chatMessage', data);
    socket.emit('chatMessage', data);
  });

  //Send error message to user on submit
  socket.on('errorMessage', function(data){
    socket.emit('chatMessage', data);
  });

  //Check if user exists
  socket.on('checkUser', function(username){
    var exist = false;
    for (var key in users){
      if (users[key] === username){
        exist = true;
      }
    }
    socket.emit('userExist', exist);
  });

  function userExist(object, username){
    for (var key in object){
      if (users[key] === username){
        return true;
      }
    }
    return false;
  }

  socket.on('enqueue', function(data) {
    // data.username = users[socket.id];
    if (current) {
      //maz edit
      data.votes = {upvotes: 0, downvotes: 0}
      queue.push(data);
      io.emit('addVideo', data);

    } else {
      set = false;
      current = data;
      reset();
    }
  });

  socket.on('dequeue', function(data) {
    var id = socket.id;

    if (id.slice(2) === data.socket) {
      io.emit('removeVideo', data.id);
    }
  });

  // socket.on('updateQueue', function(data) {
  //   queue = data;
  //   console.log('queue in server updateQ ', queue)
  //   socket.emit('refreshQueue', queue);
  // });

  socket.on('easterEgg', function() {
    if (queue.length) {
      queue.unshift({ id: 'SbyZDq76T74', 
                      title: 'Meow Mix song', 
                      username: 'Meow Mode', 
                      socket: current.socket });
      current = queue.shift();
      reset();

    } else {
      current = { id: 'SbyZDq76T74', 
                  title: 'Meow Mix song', 
                  username: 'Meow Mode', 
                  socket: socket.id.slice(2) };
      reset();
    }
  });

  //Receives video ended from client and sets current to next in queue
  //Jerry-rigged so that the fastest client emits the switch and locks other clients out for 5 seconds
  socket.on('ended', function() {
    io.emit('addToHistory', current);
    if (!switched) {
      switched = true;
      set = false;
      current = queue.shift();
      reset();
      setTimeout(function() {
        switched = false;
      }, 5000);
    }
  });

  
  //Allows skipping if event is emitted by client who enqueued video
  socket.on('skip', function(easterEgg) {
    var id = socket.id;
    if (current && id.slice(2) === current.socket || easterEgg) {
      if (queue.length) {
        io.emit('addToHistory', current);
        set = false;
        current = queue.shift();
        reset();
      } else {
        io.emit('addToHistory', current);
        set= false;
        current = null;
        reset();
        io.emit('stopVideo');
      }
      io.emit('skipAuth', { username: users[socket.id], title: current.title });
    } else {
      io.sockets.connected[socket.id].emit('skipUnAuth', { username: current.username });
    }
  });

  //Start the video sync clock
  socket.on('setDuration', function(duration) {
    if (!set) {
      set = true;
      timeTotal = duration;
      timeLeft = duration;
      clearInterval(sync);
      sync = setInterval(function() {
        timeLeft--;
        if (timeLeft === 0) {
          clearInterval(sync);
        }
      }, 1000);
    }
  });

  //Removes client vote information and delete client on client disconnect
  socket.on('disconnect', function() {
    if (votes[socket.id] === 'up') {
      upvotes--;
    }

    if (votes[socket.id] === 'down') {
      downvotes--;
    }

    io.emit('changeVotes', {up: upvotes, down: downvotes});

    io.emit('activityLog', {username: users[socket.id], action: "has left", title: ""});

    delete users[socket.id];

    io.emit('usersOnline', users);
  });

  //Receives upvote from client and updates vote information; emitting to all clients
  socket.on('upVote', function() {
    if (votes[socket.id] === 'down') {
      votes[socket.id] = 'up';
      downvotes--;
      upvotes++;
      socket.emit('validUpvote');
    } else if (votes[socket.id] === 'up'){
      socket.emit('upvotedLog');
    }
    
    if (votes[socket.id] === undefined) {
      votes[socket.id] = 'up';
      upvotes++;
      socket.emit('validUpvote');
    }

    io.emit('changeVotes', {up: upvotes, down: downvotes});
  });

  socket.on('downVote', function(data){
    if(votes[socket.id] === 'up'){
      votes[socket.id] = 'down';
      upvotes--;
      downvotes++;
      socket.emit('validDownvote');
    } else if (votes[socket.id] === 'down'){
      socket.emit('downvotedLog');
    }

    if(votes[socket.id] === undefined) {
      votes[socket.id] = 'down';
      downvotes++;
      socket.emit('validDownvote');
    }

    //Skips current video if more haters than non-haters
    var haters = downvotes/Object.keys(users).length;

    if(haters > 0.5) {
      io.emit('addToHistory', current);
      if (queue.length) {
        set = false;
        current = queue.shift();
        reset();
      } else {
        set= false;
        current = null;
        reset();
        io.emit('stopVideo');
      }
      //Tells client video skipped due to majority downvote - implemented the same way us initialDownvote so that skip log comes after downvote log
      socket.emit('voteSkipped', data); 
    }

    

    io.emit('changeVotes', {up: upvotes, down: downvotes});
  });
  
  //When server receives from client, logs message
  socket.on('sendVoteSkipped', function(data) {
    io.emit('voteSkipLog', data);
  });

  socket.on('qUpVote', function(songID){
    if (votes[socket.id + songID] !== 'up'){
      queue.forEach(function(song){
        if(song.id === songID){
          console.log('qUpVote in server ', queue)
          song.votes.upvotes++
          if (votes[socket.id + songID] === 'down'){
            song.votes.downvotes--
          }
        }
      })
    }   
        votes[socket.id + songID] = 'up'
        io.emit('updateQueue', queue)
  })

  socket.on('qDownVote', function(songID){
    if (votes[socket.id + songID] !== 'down'){
      queue.forEach(function(song){
        if(song.id === songID){
          console.log('qDownVote in server ', queue)
          song.votes.downvotes++
          if (votes[socket.id + songID] === 'up'){
            song.votes.upvotes--
          }
        }
      })
    }
        votes[socket.id + songID] = 'down'
        io.emit('updateQueue', queue)
  })
  //Sends clock time to client when requested
  socket.on('getSync', function() {
    io.sockets.connected[socket.id].emit('setSync', timeTotal - timeLeft || timeTotal);
  });
  
  //relays clearlog slash command to log controller
  socket.on('sendClearLog', function() {
    socket.emit('clearLog');
  });
  
  //relays search by slash command to search controller
  socket.on('sendSearchOrder', function(data){
    socket.emit('changeSearchOrder', data);
    socket.emit('searchOrderLog', data);
  });

});


