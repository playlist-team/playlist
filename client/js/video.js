angular.module('app', ['chat', 'search'])

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
    closeOnConfirm: true,
    confirmButtonColor: '#1171A2'
  }, function(username) {
    $window.username = username || 'anonymous';
    socket.emit('username', $window.username);
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

  function onPlayerReady (event) {
    event.target.playVideo();

    socket.emit('getCurrent');

    socket.on('setCurrent', function(video) {
      player.setVolume(50);
      context.current = video;
      player.loadVideoById(video.id);
      $rootScope.$emit('changeQueue');
      socket.emit('getTime');
    });

    socket.on('setVolume', function() {
      player.setVolume(50);
    });

    $rootScope.$on('volumeChange', function(event, volume) {
      player.setVolume(volume);
    });
  }

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      context.current = null;
      socket.emit('ended');
    }
    if (event.data === YT.PlayerState.PLAYING) {
      var total = player.getDuration();
      var current = player.getCurrentTime();
      var timeLeft = total - current;
      $rootScope.$emit('setTimer', timeLeft);
    }
    if (event.data === YT.PlayerState.PAUSED) {
      $rootScope.$emit('paused');
    }
  }

  socket.on('setTime', function(time) {
    player.seekTo(time, false);
  });

  socket.on('firstVideo', function(video) {
    context.current = video;
    player.loadVideoById(video.id);
    $rootScope.$emit('changeQueue');
    socket.emit('setDuration', player.getDuration());
  });

  socket.on('nextVideo', function(video) {
    context.current = video;
    player.loadVideoById(video.id);
    $rootScope.$emit('changeQueue');
    socket.emit('setDuration');
  });

  socket.on('stopVideo', function() {
    player.stopVideo();
  });

  socket.on('addVideo', function(video) {
    context.queue.push(video);
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

  socket.on('refreshQueue', function(queue) {
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

  $scope.volume;
  $scope.timer;
  $scope.duration;
  $scope.current;
  $scope.playlist;
  $scope.upvotes = 0;
  $scope.downvotes = 0;

  socket.on('setId',function(socketId) {
    $scope.socketId = socketId.slice(2);
  });

  $rootScope.$on('paused', function(event, time) {
    clearInterval($scope.timer);
  });

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
          $scope.duration = '0:00';
        }
      });
    }, 1000);
  });

  $scope.$watch('volume', function() {
    $rootScope.$emit('volumeChange', $scope.volume);
  });

  $scope.dequeue = function(videoId) {
    socket.emit('dequeue', videoId);
  }

  $scope.skip = function() {
    socket.emit('skip');
  }

  $scope.sync = function() {
    socket.emit('getSync');
  }

  $rootScope.$on('changeQueue', function() {
    $scope.$apply(function() {
      $scope.current = VideoService.current;
      $scope.playlist = VideoService.queue;
    });
  });

  $scope.upVote = function() { 
    socket.emit('upVote');
  }

  $scope.downVote = function() {
    socket.emit('downVote');
  }

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