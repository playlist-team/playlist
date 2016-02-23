angular.module('musicApp', ['ngRoute','chat'])

.run(function($window){
  var tag = document.createElement('script');

  tag.src = "https://www.youtube.com/iframe_api";

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  $window.socket = io.connect($window.location.hostname || 'http://localhost:3000');

  $window.username = $window.prompt('Username: ');

  $window.socket.on('connect', function() {
    $window.socket.emit('getQueue');
    $window.socket.emit('setUser', $window.username);
  });
})

.config(function($routeProvider, $locationProvider){
  $routeProvider
    .when('/', {
      templateUrl: '/youtube.html',
      controller: 'YouTubeController'
    })
    .otherwise({
      redirectTo:'/'
    })
    $locationProvider.html5Mode(true);
})

.service('VideoService', ['$window', '$rootScope', function($window, $rootScope) {
  var context = this;

  this.player;
  this.queue = [];

  $window.onYouTubeIframeAPIReady = function() {
    this.player = new YT.Player('player', {
      height: '400',
      width: '640',
      playerVars: {
        'autohide': 1,
        'modestbranding': 1,
        'controls': 1
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

    socket.on('sendCurrent', function(videoID) {
      player.loadVideoById(videoID);
      socket.emit('getTime');
    })
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      socket.emit('videoEnded')
    }
  };

  socket.on('sendTime', function(duration) {
    player.seekTo(duration, false);
  })

  socket.on('firstVideo', function(videoID) {
    player.loadVideoById(videoID);
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
    player.loadVideoById(video.id);
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
}])


.controller('YouTubeController', ['$scope', 'VideoService', '$rootScope', function($scope, VideoService, $rootScope){

  $scope.dequeue = function(videoID){
    socket.emit('dequeue', videoID);
  };

  $scope.list = VideoService.queue;
  $rootScope.$on('changeQueue', function(){
    $scope.$apply(function() {
      $scope.list = VideoService.queue;
    });
  });

}])