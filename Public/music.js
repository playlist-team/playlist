angular.module('musicApp', ['ngRoute','chat'])

.run(function($window){
  var tag = document.createElement('script');

  tag.src = "https://www.youtube.com/iframe_api";

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  $window.socket = io.connect('http://localhost:3000');
  $window.socket.on('connect', function(data) {
    $window.socket.emit('getQueue');
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

.service('VideoService', ['$window', '$rootScope', function($window, $rootScope){
  var context = this;
  this.player;
  this.queue = [];
  $window.onYouTubeIframeAPIReady = function() {
    this.player = new YT.Player('player', {
      height: '400',
      width: '640',
      videoId: '4ITLNzPoEqs',
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    })
  };

  function onPlayerReady (event) {
    event.target.playVideo();
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {

      socket.emit('songended')
    }
  };

  function stopVideo() {
    context.player.stopVideo();
  };

  function checkQueue(){
    if(context.queue.length===0){
      return false;
    }
    var next = context.queue.shift();
    $rootScope.$emit('queueChange', context.queue);
    return next;
  }

  socket.on('addVideo', function(data) {
    context.queue.push(data);
    $rootScope.$emit('queueChange', context.queue);
    socket.emit('queuelist', context.queue)
  })

  socket.on('removeVideo', function(songId){
    context.queue.forEach(function(song, index){
      if(song.id === songId){
        context.queue.splice(index, 1);
      }
    })
    $rootScope.$emit('queueChange', context.queue);

    socket.emit('queuelist', context.queue);
  })

  socket.on('nextsong', function(song){
    player.loadVideoById(song.id);
  })

  socket.on('queues', function(queue){
    context.queue = queue;
    $rootScope.$emit('queueChange', context.queue);
  })

  socket.on('sendQueue', function(data) {
    context.queue = data;
    $rootScope.$emit('queueChange', context.queue);
  })

}])


.controller('YouTubeController', ['$scope', 'VideoService', '$rootScope', function($scope, VideoService, $rootScope){

  $scope.dequeue = function(songId){
    socket.emit('dequeue', songId);
  }

  $scope.list = VideoService.queue;
  $rootScope.$on('queueChange', function(){
    $scope.$apply(function() {
      $scope.list = VideoService.queue;
    });
  });

}])




