angular.module('musicApp', ['chat', 'search'])

//to load the YouTube video player when the doc loads
.run(function($window){
  var tag = document.createElement('script');

  tag.src = 'https://www.youtube.com/iframe_api';

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // the io.connect below has to be switched depending on whether you
  // are running app locally or on heroku

  $window.socket = io.connect('http://localhost:3000');
  // $window.socket = io.connect($window.location.hostname || 'http://localhost:3000');

  // once a socket is first connected, all code below becomes functional
  $window.socket.on('connect', function() {
     $window.socket.emit('getQueue');
  });

  // sweetalert code for nicer looking alert box
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
    socket.emit('setUser', $window.username);
  });
})

// to remove the # from the URL
.config(function($locationProvider){
  $locationProvider.html5Mode(true);

})

// this service handles YouTube player functions
.service('VideoService', ['$window', '$rootScope', function($window, $rootScope) {
  var context = this;

  this.current = null;
  this.player;
  this.queue = [];

  // to instantiate a new YouTube player and set its attributes
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
    })
  };


  function onPlayerReady (event) {
    event.target.playVideo();

    socket.emit('getCurrent');

    socket.on('sendCurrent', function(video) {
      player.setVolume(50);
      context.current = video;
      player.loadVideoById(video.id);
      $rootScope.$emit('changeQueue');
      socket.emit('getTime');
    })

    socket.on('setVolume', function() {
      player.setVolume(50);
    })

    $rootScope.$on('volumeChange', function(event, volume) {
      player.setVolume(volume);
    })

  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      context.current = null;
      socket.emit('videoEnded');
      $rootScope.$emit('hide');
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
  };
  // route everything to and from server with socket listeners
  socket.on('sendTime', function(time) {
    player.seekTo(time, false);
  })

  socket.on('firstVideo', function(video) {
    context.current = video;
    player.loadVideoById(video.id);
    $rootScope.$emit('changeQueue');
    socket.emit('setDuration', player.getDuration());
  })

  socket.on('addVideo', function(video) {
    context.queue.push(video);
    $rootScope.$emit('changeQueue');
  })

  socket.on('removeVideo', function(videoId){
    context.queue.forEach(function(video, index){
      if(video.id === videoId){
        context.queue.splice(index, 1);
      }
    })
    $rootScope.$emit('changeQueue');
    socket.emit('updateQueue', context.queue);
  })

  socket.on('nextVideo', function(video){
    context.current = video;
    player.loadVideoById(video.id);
    $rootScope.$emit('changeQueue');
    socket.emit('setDuration');
  })

  socket.on('refreshQueue', function(queue){
    context.queue = queue;
    $rootScope.$emit('changeQueue');
  })

  socket.on('sendQueue', function(queue) {
    context.queue = queue;
    $rootScope.$emit('changeQueue');
  })

  socket.on('stopVideo', function() {
    player.stopVideo();
    $rootScope.$emit('hide');
  })

  socket.on('sendSync', function(time) {
    player.stopVideo();
    player.seekTo(time, false);
    player.playVideo();
  })

}])

// YouTube controller to handle the view
.controller('YouTubeController', ['$scope', 'VideoService', '$rootScope', function($scope, VideoService, $rootScope){
  // to let user control YouTube volume with slider
  $scope.volume;
  $scope.timer;
  $scope.duration;
  $scope.seconds;
  $scope.minutes;
  $scope.started;
  $scope.time;

  $rootScope.$on('hide', function() {
      $scope.started = false;
  })

  $rootScope.$on('paused', function(event, time) {
      clearInterval($scope.timer);
  })

  $rootScope.$on('setTimer', function(event, time) {
    $scope.started = true;
    $scope.duration = Math.round(time);
    clearInterval($scope.timer);
    $scope.timer = setInterval(function() {
      $scope.duration--;
      $scope.$apply(function() {
        $scope.seconds = $scope.duration % 60;
        if($scope.seconds < 10) {
          $scope.seconds = '0' + $scope.seconds;
        }
        $scope.minutes = Math.floor($scope.duration / 60);
        $scope.time = $scope.minutes + ":" + $scope.seconds;
        if ($scope.duration < 0) {
          $scope.time = '0:00';
        }
      })
    }, 1000);
  })

  $scope.$watch('volume', function(newValue, oldValue) {
    $rootScope.$emit('volumeChange', $scope.volume);
  })

  // when user clicks remove video from playlist
  // we emit this to server and on that end video removed from list
  $scope.dequeue = function(videoId){
    socket.emit('dequeue', videoId);
  };

  // to instantly load next available video in playlist queue
  $scope.skip = function() {
    socket.emit('skip');
  }
  // if user pauses video, sync allows user to jump to actual video frame
  // that had continued to run for all other users
  $scope.sync = function() {
    socket.emit('getSync');
  }

  $scope.current = VideoService.current;

  $scope.list = VideoService.queue;

  socket.on('usernamewindow',function(username){
    $scope.username = username;
  })

  $rootScope.$on('changeQueue', function(){
    $scope.$apply(function() {
      $scope.current = VideoService.current;
      $scope.list = VideoService.queue;
    });
  });
  // to handle up and down votes; one vote per user
  $scope.upcount = 0;
  $scope.downcount = 0;

  $scope.upCount = function(){
    socket.emit('upVote');
  }

  $scope.downCount = function(){
    socket.emit('downVote');
  }

  //e.g, if user initially upvotes, then downvotes, this
  //function reflects change, incrementing downvote and decrementing
  //upvote
  socket.on('changeVote', function(votes){
    $scope.$apply(function() {
      $scope.upcount = votes.up;
      $scope.downcount = votes.down;
    });
  })
  //when new video starts, votes reset to 0 and 0
  socket.on('clearVotes', function(){
    $scope.$apply(function(){
      $scope.upcount = 0;
      $scope.downcount = 0;
    })
  })
  //to emit to the server when a user make a vote
  socket.on('sendVotes', function(votes) {
    $scope.$apply(function() {
      $scope.upcount = votes.up;
      $scope.downcount = votes.down;
    });
  })

}])