var express = require('express');

var app = express();

var port = process.env.PORT || 3000;

app.use('/', express.static('./client'));

var server = app.listen(port);

var io = require('socket.io')({
  transports: ["xhr-polling"],
  'polling duration': 10,
  'pingInterval': 100,
  'pingTimeout': Infinity
}).listen(server);

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
var switched = false;

var adjectives = [
  "nameless",
  "undisclosed",
  "unidentified",
  "unnamed",
  "incognito",
  "secret",
  "hidden",
  "discreet",
  "concealed",
  "obscured",
  "masked",
  "veiled",
  "shrouded",
  "disguised",
  "repressed",
  "shy",
  "anonymous",
  "unknown",
  "sly",
  "sneaky",
  "stealthy",
  "furtive",
  "covert",
  "shady",
  "clandestine",
  "hushed",
  "closeted",
  "surreptitious",
  "unauthorized",
  "cloaked",
  "invisible",
  "undercover"
]

var creatures = [
  "oyster",
  "impala",
  "mackerel",
  "roedeer",
  "greyhound",
  "wasp",
  "magpie",
  "polecat",
  "zebra",
  "clam",
  "pidgeon",
  "rattlesnake",
  "pheasant",
  "ptarmigan",
  "gnat",
  "quail",
  "heron",
  "elk",
  "camel",
  "panda",
  "turtledove",
  "wombat",
  "bullfinche",
  "lapwing",
  "dolphin",
  "moth",
  "wildebeest",
  "lemur",
  "sheldrake",
  "woodchuck",
  "otter",
  "bobolink",
  "smelt",
  "raccoon",
  "ostrich",
  "rhinoceros",
  "pelican",
  "gibbon",
  "dingo",
  "mandrill",
  "weasel",
  "penguin",
  "guillemot",
  "walrus",
  "opossum",
  "bongo",
  "yak",
  "goosander",
  "gorilla"
]

var mpthree = [];

var getRandom = function(words) {
  var index = Math.floor(Math.random() * words.length);
  return words[index];
}

//Helper function to reset the state of clients connected
var reset = function() {
  votes = {};
  upvotes = 0;
  downvotes = 0;
  io.emit('clearVotes');
  io.emit('nextVideo', current);
  io.emit('setQueue', queue);
}

io.on('connection', function(socket) {
  
  socket.on('file', function(file) {
    mpthree.push(file);
    console.log(mpthree);
    io.sockets.connected[socket.id].emit('backatya', mpthree[0]);
  })

  socket.on('hello', function() {
    console.log('hello');
  })

  //Receives username from client and emits username, socket id, users online back to client
  socket.on('username', function(username) {
    if (username === 'anonymous') {
      username = getRandom(adjectives) + "_" + getRandom(creatures);
    }
    users[socket.id] = username;
    io.sockets.connected[socket.id].emit('setUser', username);
    io.sockets.connected[socket.id].emit('setId', socket.id);
    socket.broadcast.emit('joinMessage', {joined: "›› " + users[socket.id] + " has joined ››"});
    io.sockets.connected[socket.id].emit('chatMessage', {
      username: "playbot",
      message: "Hello, " + users[socket.id] + "! " + "To get started, search for videos or sounds to add to the playlist. You can also type '/help' to see a list of commands."
    });
    io.emit('usersOnline', users);
    io.sockets.connected[socket.id].emit('setQueue', queue);
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

  socket.on('enqueue', function(data) {
    if (current) {

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

  socket.on('updateQueue', function(data) {
    queue = data;
    socket.broadcast.emit('refreshQueue', queue);
  });

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
  //Jerry-rigged so that the fastest client emits the switch and locks other clients out for half of video duration
  socket.on('ended', function() {
    if (!switched) {
      switched = true;
      set = false;
      if (queue.length) {
        current = queue.shift();
        var timer;
        if (current.soundcloud === true) {
          timer = current.duration/2;
        } else {
          timer = ((current.duration/60) * 1000)/2;
        }
        reset();
        setTimeout(function() {
          switched = false;
        }, timer);
      } else {
        switched = false;
        set = false;
        current = null;
        reset();
        io.emit('stopVideo');
      }
    }
  });

  //Allows skipping if event is emitted by client who enqueued video
  socket.on('skip', function(easterEgg) {
    var id = socket.id;
    if (current && id.slice(2) === current.socket || easterEgg) {

      if (queue.length) {
        set = false;
        current = queue.shift();
        reset();
      } else {
        set = false;
        current = null;
        reset();
        io.emit('stopVideo');
      }
    }
  });

  //Start the video sync clock
  socket.on('setDuration', function(video) {
    if (video.sc === true) {
      video.duration = video.duration/1000;
    }
    if (!set) {
      set = true;
      timeTotal = video.duration;
      timeLeft = video.duration;
      clearInterval(sync);
      setTimeout(function() {
        sync = setInterval(function() {
          timeLeft--;
          if (timeLeft === 0) {
            clearInterval(sync);
          }
        }, 1000);
      }, 2000)
    }
  });

  //Removes client vote information and delete client on client disconnect
  socket.on('disconnect', function() {

    var name = users[socket.id] || 'someone';

    if (votes[socket.id] === 'up') {
      upvotes--;
    }

    if (votes[socket.id] === 'down') {
      downvotes--;
    }

    io.emit('changeVotes', {up: upvotes, down: downvotes});

    io.emit('joinMessage', {left: "›› " + name + " has left ››"});

    delete users[socket.id];

    io.emit('usersOnline', users);
  });

  //Handles socket reconnect event with client
  socket.on('reconnect', function() {
    io.sockets.connected[socket.id].emit('comeback');
  });

  //Updates username on reconnection
  socket.on('return', function(username) {
    users[socket.id] = username;
    io.sockets.connected[socket.id].emit('setUser', username);
    io.sockets.connected[socket.id].emit('setId', socket.id);
    io.emit('chatMessage', {username: "", message: users[socket.id] + " has reconnected"});
    io.emit('usersOnline', users);
  })

  //Receives upvote from client and updates vote information; emitting to all clients
  socket.on('upVote', function() {
    if (votes[socket.id] === 'down') {
      votes[socket.id] = 'up';
      downvotes--;
      upvotes++;
    }

    if (votes[socket.id] === undefined) {
      votes[socket.id] = 'up';
      upvotes++;
    }

    io.emit('changeVotes', {up: upvotes, down: downvotes});
  });

  socket.on('downVote', function(){
    if(votes[socket.id] === 'up'){
      votes[socket.id] = 'down';
      upvotes--;
      downvotes++;
    }

    if(votes[socket.id] === undefined) {
      votes[socket.id] = 'down';
      downvotes++;
    }

    //Skips current video if more haters than non-haters
    var haters = downvotes/Object.keys(users).length;

    if(haters > 0.5) {
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
    }
    
    io.emit('changeVotes', {up: upvotes, down: downvotes});
  });

  //Sends clock time to client when requested
  socket.on('getSync', function() {
    io.sockets.connected[socket.id].emit('setSync', timeTotal - timeLeft || timeTotal);
  });

});
