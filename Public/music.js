angular.module('musicApp', ['chat', 'search'])

.run(function($window){
  var tag = document.createElement('script');

  tag.src = "https://www.youtube.com/iframe_api";

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  $window.socket = io.connect('http://localhost:3000');
  /*$window.socket = io.connect($window.location.hostname || 'http://localhost:3000');*/

  $window.username = $window.prompt('Username: ') || 'anonymous';
  $window.socket.on('connect', function() {
    $window.socket.emit('getQueue');
    $window.socket.emit('setUser', $window.username);
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
    })
    this.player.setVolume(50);
  };


  function onPlayerReady (event) {
    event.target.playVideo();
    socket.emit('getCurrent');

    socket.on('sendCurrent', function(video) {
      context.current = video;
      player.loadVideoById(video.id);
      $rootScope.$emit('changeQueue');
      socket.emit('getTime');
    })
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      context.current = null;
      socket.emit('videoEnded');
    }
  };

  socket.on('sendTime', function(duration) {
    player.seekTo(duration, false);
  })

  socket.on('firstVideo', function(video) {
    context.current = video;
    player.loadVideoById(video.id);
    $rootScope.$emit('changeQueue');
    socket.emit('setDuration', player.getDuration());
  })

  socket.on('addVideo', function(data) {
    context.queue.push(data);
    $rootScope.$emit('changeQueue');
  })

  socket.on('removeVideo', function(videoID){
    context.queue.forEach(function(video, index){
      if(video.id === videoID){
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
    socket.emit('setDuration', player.getDuration());
  })

  socket.on('refreshQueue', function(queue){
    context.queue = queue;
    $rootScope.$emit('changeQueue');
  })

  socket.on('sendQueue', function(data) {
    context.queue = data;
    $rootScope.$emit('changeQueue');
  })

  socket.on('stopVideo', function() {
    player.stopVideo();
  })

  $rootScope.$on('skip', function() {
    socket.emit('skip');
  })

  $rootScope.$on('volumeChange', function(event, volume) {
    player.setVolume(volume);
  })
}])


.controller('YouTubeController', ['$scope', 'VideoService', '$rootScope', function($scope, VideoService, $rootScope){

  $scope.volume = 50;

  $scope.$watch('volume', function(newValue, oldValue) {
    $rootScope.$emit('volumeChange', $scope.volume);
  })

  $scope.dequeue = function(videoID){
    socket.emit('dequeue', videoID);
  };

  $scope.skip = function() {
    $rootScope.$emit('skip');
  }

  $scope.current = VideoService.current;

  $scope.list = VideoService.queue;

  $rootScope.$on('changeQueue', function(){
    $scope.$apply(function() {
      $scope.current = VideoService.current;
      $scope.list = VideoService.queue;
    });
  });

  $scope.upcount = 0;
  $scope.downcount = 0;

  $scope.upCount = function(){
    socket.emit("upVote");
  }

  $scope.downCount = function(){
    socket.emit("downVote");
  }

  socket.on('changeVote', function(vote){
    $scope.$apply(function() {
      if(vote === 'minusDown'){
        $scope.downcount--;
      }
      if(vote === 'minusUp'){
        $scope.upcount--;
      }
      if(vote === 'addDown'){
        $scope.downcount++;
      }
      if(vote === 'addUp'){
        $scope.upcount++;
      }
    });
  })

  socket.on('clearVotes', function(){
    $scope.$apply(function(){
      $scope.upcount = 0;
      $scope.downcount = 0;
    })
  })

}])