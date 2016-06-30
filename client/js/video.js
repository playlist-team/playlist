angular.module('app', ['chat', 'search'])

//Load YouTube iFrame API, connect socket to server, prompt for username on initialize
.run(function($rootScope) {
  var tag = document.createElement('script');

  tag.src = 'https://www.youtube.com/iframe_api';

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  $rootScope.socket = io.connect();

  SC.initialize({
    client_id: "376f225bf427445fc4bfb6b99b72e0bf"
  });

  $rootScope.socket.on('connect', function() {
    swal({
      title: 'Welcome to Playlist',
      text: 'Enter your username',
      type: 'input',
      inputType: 'text',
      showCancelButton: true,
      loseOnConfirm: true,
      confirmButtonColor: '#1171A2'
    }, function(username) {
      if (!username) {
        username = 'anonymous';
      }
      $rootScope.username = username.toLowerCase() || 'anonymous';
      $rootScope.socket.emit('username', $rootScope.username);
    });
  });

  var lastTarget = null;

  window.addEventListener('dragenter', function(event) {
    lastTarget = event.target;
    document.getElementById('dropzone').style.visibility = 'visible';
  });

  window.addEventListener('dragleave', function(event) {
    if(event.target === lastTarget) {
      document.getElementById('dropzone').style.visibility = 'hidden';
    }
  });

  document.getElementById('dropzone').addEventListener('dragover', function(event) {
    event.preventDefault();
    event.stopPropagation();
  })

  document.getElementById('dropzone').addEventListener('drop', function(event) {
    event.preventDefault();

    if(event.target === lastTarget) {
      document.getElementById('dropzone').style.visibility = 'hidden';
    }
    var file = event.dataTransfer.files[0];

    var key = file.name + $rootScope.socket.id;

    $rootScope.socket.emit('upload', {key: key, file: file}, function(name) {
      $rootScope.socket.emit('enqueue', { 
        id: file.name + $rootScope.socket.id,
        title: file.name,
        thumbnail: null,
        username: $rootScope.username,
        socket: $rootScope.socket.id, 
        duration: null,
        type: 'upload',
        file: null
      });
    });
  })
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
  this.source = null;
  this.audio = new AudioContext();
  this.gain = this.audio.createGain();
  this.gain.connect(this.audio.destination);
  this.gain.gain.value = 0.5;
  this.decoded;
  this.syncing = false;

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
    setTimeout(function() {
      $rootScope.socket.emit('ended');
    }, 1750);
  })

  widget.bind(SC.Widget.Events.READY, function() {
  })

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

  //Event listener for when YouTube player finished loading
  var onPlayerReady = function(event) {
    //Emits request to server to get current video
    $rootScope.socket.emit('getCurrent');
    //Receives current video from server
    $rootScope.socket.on('setCurrent', function(video) {
      context.current = video;
      $rootScope.socket.emit('getTime');
      $rootScope.$emit('changeQueue');
      if (video.type === 'soundcloud') {
        $rootScope.$emit('showCloud');
        widget.load(video.id, {auto_play: false, show_comments: false, sharing: false, download: false, liking: false, buying: false, show_playcount: false, visual: true, callback: function() {
          widget.setVolume(0);
          widget.play();
          setTimeout(function() {
            $rootScope.socket.emit('getSync');
            widget.setVolume(.5);
          }, 2000);
        }});
      } else if (video.type === 'youtube') {
        $rootScope.$emit('showTube');
        player.loadVideoById(video.id);
      } else if (video.type === 'upload') {
        context.source = context.audio.createBufferSource();
        context.audio.decodeAudioData(video.file, function(decoded) {
          context.decoded = decoded;
          $rootScope.socket.emit('getDuration');
          $rootScope.socket.on('uploadDuration', function(time) {
            context.source.buffer = context.decoded || decoded;
            context.source.connect(context.gain);
            context.source.start(context.audio.currentTime, time.duration);
            $rootScope.$emit('setTimer', time.remaining);
          })
          context.source.onended = function() {
            console.log('onended1');
            if (context.syncing) {
              context.syncing = false;
            } else {
              setTimeout(function() {
                $rootScope.socket.emit('ended');
              }, 1750);
            }
          }
        })
      } else {
        console.log('ERROR');
      }
    });

    //Receives event from server to initalize volume to 50
    $rootScope.socket.on('setVolume', function() {
      context.volume = .5;
      widget.setVolume(.5);
      player.setVolume(50);
    });

    //Listens for volumeChange from Controller and sets the volume
    $rootScope.$on('volumeChange', function(event, volume) {
      context.volume = volume/100;
      context.gain.gain.value  = volume/100;
      player.setVolume(volume);
      widget.setVolume(context.volume);
    });
  }

  //Event listener for whenever the player's state changes
  var onPlayerStateChange = function(event) {
    //Emit event notifying server that player has ended video
    if (event.data === YT.PlayerState.ENDED) {
      setTimeout(function() {
        $rootScope.socket.emit('ended');
      }, 1750);
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
  $rootScope.socket.on('setTime', function(time) {
    context.time = time * 1000;
    player.seekTo(time, false);
    widget.seekTo(time * 1000);
  });

  //Recieve next video from server, plays it and emits queue to controller and time to server
  $rootScope.socket.on('nextVideo', function(video) {
    context.current = video;
    if (!video) {
      return;
    }
    if (video.type === 'soundcloud') {
      player.stopVideo();
      $rootScope.$emit('showCloud');
      widget.load(video.id, {auto_play: false, show_comments: false, sharing: false, download: false, liking: false, buying: false, show_playcount: false, visual: true, callback: function() {
        widget.setVolume(context.volume);
        widget.play();
      }});
      $rootScope.$emit('changeQueue');
      $rootScope.socket.emit('setDuration', {duration: video.duration, sc: true});
    } else if (video.type === 'youtube') {
      widget.pause();
      $rootScope.$emit('showTube');
      player.loadVideoById(video.id);
      $rootScope.$emit('changeQueue');
      $rootScope.socket.emit('setDuration', {duration: video.duration, sc: false});
    } else if (video.type === 'upload') {
      player.stopVideo();
      widget.pause();
      context.source = context.audio.createBufferSource();
      context.audio.decodeAudioData(video.file, function(decoded) {
        context.decoded = decoded;
        context.source.buffer = decoded;
        context.source.connect(context.gain);
        $rootScope.$emit('setTimer', decoded.duration);
        $rootScope.socket.emit('setDuration', {duration: decoded.duration, sc: false});

        setTimeout(function() {
          context.source.start();
        }, 2000);

        context.source.onended = function() {
          console.log('onended')
          if (context.syncing) {
            context.syncing = false;
          } else {
            setTimeout(function() {
              $rootScope.socket.emit('ended');
            }, 1750);
          }
        }

      })
    } else {
      console.log('ERROR');
    }
  });

  $rootScope.socket.on('stopVideo', function() {
    $rootScope.$emit('placeHodor');
    player.stopVideo();
    widget.pause();
  });

  $rootScope.socket.on('addVideo', function(video) {
    context.queue.push(video);
    $rootScope.$emit('changeQueue');
  });

  $rootScope.socket.on('removeVideo', function(videoId){
    context.queue.forEach(function(video, index){
      if(video.id === videoId){
        context.queue.splice(index, 1);
      }
    });
    $rootScope.$emit('changeQueue');
    $rootScope.socket.emit('updateQueue', context.queue);
  });

  $rootScope.socket.on('setQueue', function(queue) {
    context.queue = queue;
    $rootScope.$emit('changeQueue');
  });

  $rootScope.socket.on('setSync', function(time) {
    if (context.current.type === 'youtube') {
      player.pauseVideo();
      player.seekTo(time.duration, true);
      player.playVideo();
    } else if (context.current.type === 'soundcloud') {
      widget.seekTo(time.duration * 1000);
    } else if (context.current.type === 'upload') {
      context.source.stop();
      context.source = context.audio.createBufferSource();
      context.source.buffer = context.decoded;
      context.source.connect(context.gain);
      $rootScope.$emit('setTimer', time.remaining);
      context.source.start(context.audio.currentTime, time.duration);
    }
  });

  $rootScope.socket.on('triggerEnded', function() {
    console.log('tirggerENDED');
    context.source.stop();
  })

}])

.controller('YouTubeController', ['$scope', 'VideoService', '$rootScope', function($scope, VideoService, $rootScope) {

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
  $rootScope.socket.on('setId',function(socketId) {
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

  $rootScope.$on('placeHodor', function() {
    $scope.widget = false;
    $scope.tube = false;
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
    $rootScope.socket.emit('dequeue', videoId);
  }

  $scope.skip = function() {
    $rootScope.socket.emit('skip');
  }

  $scope.sync = function() {
    VideoService.syncing = true;
    $rootScope.socket.emit('getSync');
  }

  $rootScope.$on('changeQueue', function() {
    $scope.$apply(function() {
      $scope.current = VideoService.current;
      $scope.playlist = VideoService.queue;
    });
  });

  $scope.upVote = function() { 
    $rootScope.socket.emit('upVote');
  }

  $scope.downVote = function() {
    $rootScope.socket.emit('downVote');
  }

  $rootScope.socket.on('changeVotes', function(votes) {
    $scope.$apply(function() {
      $scope.upvotes = votes.up;
      $scope.downvotes = votes.down;
    });
  });

  $rootScope.socket.on('clearVotes', function() {
    $scope.$apply(function() {
      $scope.upvotes = 0;
      $scope.downvotes = 0;
    });
  });

}]);