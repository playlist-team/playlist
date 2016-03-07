angular.module('app', ['chat', 'search', 'log', 'history'])

//Load YouTube iFrame API, connect socket to server, prompt for username on initialize
.run(function($window) {
  var tag = document.createElement('script');

  tag.src = 'https://www.youtube.com/iframe_api';

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  $window.socket = io.connect();

  $window.socket.on('connect', function() {
     $window.socket.emit('getQueue');
  });

      swal({
        title: 'Welcome to Playlist',
        text: 'Enter your username',
        type: 'input',
        inputType: 'text',
        showCancelButton: true,
        closeOnConfirm: false,
        confirmButtonColor: '#1171A2'
      }, function(username) {
        $window.username = username || 'anonymous';

        if ($window.username !== 'anonymous'){
          socket.emit('checkUser', username);
        } else {
          socket.emit('username', $window.username);
        }

        socket.on('userExist', function(exists){
          if (exists){
            console.log('it does exist');
            swal.showInputError("Username exists. Please choose a different name.");
            return false;
          } 
          socket.emit('username', $window.username);
          swal({  title: "Welcome, "+$window.username,   
                  text: "<section style='font-size: 30px''><p'font-size: 30px'>To send private messages use '@' <span style='color:red'>(ex. @peter hey!)</span></p><br/><p style='font-size: 30px'>To see a list of slash commands type <span style='color: green'>'/help'</span></p></section>",   
                  html: true
                  // , timer: 7000 
                });
        });
      });

  })

.config(function($locationProvider){
  $locationProvider.html5Mode(true);
})

.service('VideoService', ['$window', '$rootScope', function($window, $rootScope) {
  var context = this;

  this.current = null;
  this.player;
  this.queue = [];

  //Instantiate new YouTube player after iFrame API has loaded
  $window.onYouTubeIframeAPIReady = function() {
    this.player = new YT.Player('player', {
      height: '360',
      width: '640',
      playerVars: {
        'autohide': 1,
        'modestbranding': 1,
        'controls': 0,
        'iv_load_policy': 3,
        'showinfo': 0,
        'rel': 0,
        'color': 'white'
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  }

  //Event listener for when YouTube player finished loading
  function onPlayerReady(event) {
    //Emits request to server to get current video
    socket.emit('getCurrent');
    //Receives current video from server
    socket.on('setCurrent', function(video) {
      context.current = video;
      socket.emit('getTime');
      $rootScope.$emit('changeQueue');
      player.loadVideoById(video.id);
    });
    //Receives event from server to initalize volume to 50
    socket.on('setVolume', function() {
      player.setVolume(50);
    });
    //Listens for volumeChange from Controller and sets the volume
    $rootScope.$on('volumeChange', function(event, volume) {
      player.setVolume(volume);
    });
  }

  //Event listener for whenever the player's state changes
  function onPlayerStateChange(event) {
    //Emit event notifying server that player has ended video
    if (event.data === YT.PlayerState.ENDED) {
      socket.emit('ended');
    }
    //Calculate remaining time of video playing and emit to controller
    if (event.data === YT.PlayerState.PLAYING) {
      var total = player.getDuration();
      var current = player.getCurrentTime();
      var timeLeft = total - current;
      $rootScope.$emit('setTimer', timeLeft);
    }
    //Emit to controller that player has paused
    if (event.data === YT.PlayerState.PAUSED) {
      $rootScope.$emit('paused');
    }
  }

  //Receive remaining time from server and seeks video to that time
  socket.on('setTime', function(time) {
    player.seekTo(time, false);
  });

  // Recieve first video from server, plays it and emits queue to controller and time to server
  socket.on('firstVideo', function(video) {
    context.current = video;
    player.loadVideoById(video.id);
    $rootScope.$emit('changeQueue');
    socket.emit('setDuration', video.duration);
  });

  //Recieve next video from server, plays it and emits queue to controller and time to server
  socket.on('nextVideo', function(video) {
    context.current = video;
    socket.emit('setDuration', video.duration);
    player.loadVideoById(video.id);
    $rootScope.$emit('changeQueue');
  });

  socket.on('stopVideo', function() {
    player.stopVideo();
  });
  
  socket.on('addVideo', function(video) {
    console.log('video in addVideo ', video)
    context.queue.push(video);
    console.log('queue after add video ', context.queue)
    $rootScope.$emit('changeQueue');
  });

  socket.on('removeVideo', function(videoId){
    context.queue.forEach(function(video, index){
      if(video.id === videoId){
        context.queue.splice(index, 1);
      }
    });
    $rootScope.$emit('changeQueue');
    socket.emit('updateQueue', context.queue);
  });

  socket.on('setQueue', function(queue) {
    context.queue = queue;
    $rootScope.$emit('changeQueue');
  });

  socket.on('setSync', function(time) {
    player.stopVideo();
    player.seekTo(time, false);
    player.playVideo();
  });

}])

.controller('YouTubeController', ['$scope', 'VideoService', '$rootScope', function($scope, VideoService, $rootScope) {
  //maz edit
  $scope.volume;
  $scope.timer;
  $scope.duration;
  $scope.current;
  $scope.playlist;
  $scope.upvotes = 0;
  $scope.downvotes = 0;
  

  //Recieve client socket id from server
  socket.on('setId',function(socketId) {
    $scope.socketId = socketId.slice(2);
  });

  //Stops the interval on the timer on a pause event from service
  $rootScope.$on('paused', function(event, time) {
    clearInterval($scope.timer);
  });

  //Receives time remaining from service, creates a clock interval and update duration in scope
  $rootScope.$on('setTimer', function(event, time) {
    $scope.timeleft = Math.round(time);
    clearInterval($scope.timer);
    $scope.timer = setInterval(function() {
      $scope.timeleft--;
      $scope.$apply(function() {
        $scope.seconds = $scope.timeleft % 60;
        if($scope.seconds < 10) {
          $scope.seconds = '0' + $scope.seconds;
        }
        $scope.minutes = Math.floor($scope.timeleft / 60);
        $scope.duration = $scope.minutes + ":" + $scope.seconds;
        if ($scope.timeleft < 0) {
          $scope.duration = '--:--';
        }
      });
    }, 1000);
  });

  //Emit volume change information to service
  $scope.$watch('volume', function() {
    $rootScope.$emit('volumeChange', $scope.volume);
  });

  $scope.dequeue = function(video) {
    socket.emit('dequeue', video);
    socket.emit('sendLog', { action: 'removed', 
                                title: video.title });
  }

  $scope.skip = function() {
    socket.emit('skip');
    // socket.emit('sendLog', { action: 'skipped',
    //                                 title: $scope.current.title });
  }

  $scope.sync = function() {
    socket.emit('getSync');
  }

  $rootScope.$on('changeQueue', function() {
    $scope.$apply(function() {
    console.log('changeQueue called')
      $scope.current = VideoService.current;
      $scope.playlist = VideoService.queue;
      console.log('playlist in changeQueue ', $scope.playlist)
    });
  });

  $scope.upVote = function() {
    socket.emit('upVote');
  }

  $scope.downVote = function() {
    socket.emit('downVote', { title: $scope.current.title });
  }
  
  socket.on('validDownvote', function(data) {
    socket.emit('sendLog', { action: 'downvoted',
                                    title: $scope.current.title })
  });
  
  socket.on('validUpvote', function(data) {
    socket.emit('sendLog', { action: 'upvoted',
                                    title: $scope.current.title });
  })
  
  // Listens for when a video is skipped due to majority downvote, tells server to send log
  socket.on('voteSkipped', function(data) {
    socket.emit('sendVoteSkipped', data);
  });

  socket.on('refreshQueue', function(queue){
    console.log('refreshQueue video ', queue)
  })

  $scope.qUpVote = function(songID){
    socket.emit('qUpVote', songID)
  }

  $scope.qDownVote = function(songID){
    socket.emit('qDownVote', songID)
  }

  socket.on('updateQueue', function(data) {
    queue = data;
    VideoService.queue = queue
    console.log('queue in video updateQ ', queue)
    $rootScope.$emit('changeQueue');
  });

  socket.on('changeVotes', function(votes) {
    $scope.$apply(function() {
      $scope.upvotes = votes.up;
      $scope.downvotes = votes.down;
    });
  });

  socket.on('clearVotes', function() {
    $scope.$apply(function() {
      $scope.upvotes = 0;
      $scope.downvotes = 0;
    });
  });

}]);