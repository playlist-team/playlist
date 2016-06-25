angular.module('app', ['chat', 'search'])

//Load YouTube iFrame API, connect socket to server, prompt for username on initialize
.run(function($window) {
  var tag = document.createElement('script');

  tag.src = 'https://www.youtube.com/iframe_api';

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  $window.socket = io.connect();

  $window.SC.initialize({
    client_id: "376f225bf427445fc4bfb6b99b72e0bf"
  });

  swal({
    title: 'Welcome to Playlist',
    text: 'Enter your username',
    type: 'input',
    inputType: 'text',
    showCancelButton: true,
    closeOnConfirm: true,
    confirmButtonColor: '#1171A2'
  }, function(username) {
    $window.username = username || 'anonymous';
    $window.socket.emit('username', $window.username);

    $window.socket.on('connect', function() {
       $window.socket.emit('getQueue');
    });
  });
})

.config(function($locationProvider){
  $locationProvider.html5Mode(true);
})

.service('VideoService', ['$window', '$rootScope', '$q', function($window, $rootScope, $q) {
  var context = this;

  this.current = null;
  this.player;
  this.queue = [];
  this.time= null;
  this.volume = null;

  //Instantiate new YouTube player after iFrame API has loaded
  $window.onYouTubeIframeAPIReady = function() {
    this.player = new YT.Player('player', {
      height: '360',
      width: '640',
      playerVars: {
        'autohide': 1,
        'autoplay': 0,
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

  var widgetElement = document.getElementById('sc-player');
  var widget = SC.Widget(widgetElement);

  widget.bind(SC.Widget.Events.FINISH, function() {
    $window.socket.emit('ended');
  })

  // widget.bind(SC.Widget.Events.READY, function() {
  //   $window.socket.emit('getSync');
  // })

  widget.bind(SC.Widget.Events.PLAY, function() {
    var total;
    var current;
    widget.getDuration(function(duration) {
      total = duration;
      widget.getPosition(function(position) {
        current = position;
        var timeLeft = (total - current)/1000;
        $rootScope.$emit('setTimer', timeLeft);
      })
    });
  })

  widget.bind(SC.Widget.Events.SEEK, function() {
    var total;
    var current;
    widget.getDuration(function(duration) {
      total = duration;
      widget.getPosition(function(position) {
        current = position;
        var timeLeft = (total - current)/1000;
        $rootScope.$emit('setTimer', timeLeft);
      })
    });
  })

  // $window.widget = SC.oEmbed('', {auto_play: true, show_comments: false, iframe: false, maxheigth: 166}, document.getElementById('sc-player'));

  //Event listener for when YouTube player finished loading
  function onPlayerReady(event) {
    //Emits request to server to get current video
    $window.socket.emit('getCurrent');
    //Receives current video from server
    $window.socket.on('setCurrent', function(video) {
      context.current = video;
      $window.socket.emit('getTime');
      $rootScope.$emit('changeQueue');
      if (video.soundcloud === true) {
        $rootScope.$emit('showCloud');
        widget.load(video.id, {auto_play: false, show_comments: false, sharing: false, download: false, liking: false, buying: false, show_playcount: false, visual: true, callback: function() {
          widget.setVolume(0);
          widget.play();
          setTimeout(function() {
            $window.socket.emit('getSync');
            widget.setVolume(.5);
          }, 2000);
        }});
      } else {
        $rootScope.$emit('showTube');
        player.loadVideoById(video.id);
      }
    });
    //Receives event from server to initalize volume to 50
    $window.socket.on('setVolume', function() {
      context.volume = .5;
      widget.setVolume(.5);
      player.setVolume(50);
    });
    //Listens for volumeChange from Controller and sets the volume
    $rootScope.$on('volumeChange', function(event, volume) {
      context.volume = volume/100;
      player.setVolume(volume);
      widget.setVolume(volume/100);
    });
  }

  //Event listener for whenever the player's state changes
  function onPlayerStateChange(event) {
    //Emit event notifying server that player has ended video
    if (event.data === YT.PlayerState.ENDED) {
      $window.socket.emit('ended');
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
  $window.socket.on('setTime', function(time) {
    context.time = time * 1000;
    player.seekTo(time, false);
    widget.seekTo(time * 1000);
  });

  //Recieve next video from server, plays it and emits queue to controller and time to server
  $window.socket.on('nextVideo', function(video) {
    context.current = video;
    if (video.soundcloud === true) {
      player.stopVideo();
      $rootScope.$emit('showCloud');
      widget.load(video.id, {auto_play: false, show_comments: false, sharing: false, download: false, liking: false, buying: false, show_playcount: false, visual: true, callback: function() {
        widget.setVolume(context.volume);
        widget.play();
      }});
      $rootScope.$emit('changeQueue');
      socket.emit('setDuration', {duration: video.duration, sc: true});
    } else {
      widget.pause();
      $rootScope.$emit('showTube');
      player.loadVideoById(video.id);
      $rootScope.$emit('changeQueue');
      socket.emit('setDuration', {duration: video.duration, sc: false});
    }
  });

  $window.socket.on('stopVideo', function() {
    player.stopVideo();
    widget.pause();
  });

  $window.socket.on('addVideo', function(video) {
    context.queue.push(video);
    $rootScope.$emit('changeQueue');
  });

  $window.socket.on('removeVideo', function(videoId){
    context.queue.forEach(function(video, index){
      if(video.id === videoId){
        context.queue.splice(index, 1);
      }
    });
    $rootScope.$emit('changeQueue');
    $window.socket.emit('updateQueue', context.queue);
  });

  $window.socket.on('setQueue', function(queue) {
    context.queue = queue;
    $rootScope.$emit('changeQueue');
  });

  $window.socket.on('setSync', function(time) {
    if (context.current.soundcloud === false) {
      player.pauseVideo();
      player.seekTo(time, true);
      player.playVideo();
    } else {
      console.log(time);
      widget.seekTo(time * 1000);
    }
  });

}])

.controller('YouTubeController', ['$window', '$scope', 'VideoService', '$rootScope', function($window, $scope, VideoService, $rootScope) {

  $scope.volume;
  $scope.timer;
  $scope.duration;
  $scope.current;
  $scope.playlist;
  $scope.upvotes = 0;
  $scope.downvotes = 0;
  $scope.widget = false;
  $scope.tube = false;

  //Recieve client socket id from server
  $window.socket.on('setId',function(socketId) {
    $scope.socketId = socketId.slice(2);
  });

  //Stops the interval on the timer on a pause event from service
  $rootScope.$on('paused', function(event, time) {
    clearInterval($scope.timer);
  });

  $rootScope.$on('showTube', function() {
    $scope.$apply(function() {
      $scope.widget = false;
      $scope.tube = true;
    });
  });

  $rootScope.$on('showCloud', function() {
    $scope.$apply(function() {
      $scope.widget = true;
      $scope.tube = false;
    });
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

  $scope.dequeue = function(videoId) {
    $window.socket.emit('dequeue', videoId);
  }

  $scope.skip = function() {
    $window.socket.emit('skip');
  }

  $scope.sync = function() {
    $window.socket.emit('getSync');
  }

  $rootScope.$on('changeQueue', function() {
    $scope.$apply(function() {
      $scope.current = VideoService.current;
      $scope.playlist = VideoService.queue;
    });
  });

  $scope.upVote = function() { 
    $window.socket.emit('upVote');
  }

  $scope.downVote = function() {
    $window.socket.emit('downVote');
  }

  $window.socket.on('changeVotes', function(votes) {
    $scope.$apply(function() {
      $scope.upvotes = votes.up;
      $scope.downvotes = votes.down;
    });
  });

  $window.socket.on('clearVotes', function() {
    $scope.$apply(function() {
      $scope.upvotes = 0;
      $scope.downvotes = 0;
    });
  });

}]);