angular.module('musicApp', ['ngRoute','chat'])

.run(function($window){
  var tag = document.createElement('script');

  tag.src = "https://www.youtube.com/iframe_api";

  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
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
  this.player;
  this.state;
  $window.onYouTubeIframeAPIReady = function() {
    this.player = new YT.Player('player', {
      height: '400',
      width: '640',
      videoId: 'M7lc1UVf-VE',
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    })
    //$rootScope.$apply();
  };

  function onPlayerReady (event)  {
    event.target.playVideo();
    //$rootScope.$apply();
    //this.state = 'playing';
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      //this.state = 'ended';
    }
  };

  function stopVideo() {
    this.player.stopVideo();
    //this.state = 'ended'
    //$rootScope.$apply();
  };

  function checkQueue(queue){
    if(queue.length===0){
      return false;
    }
    return queue.shift()
  }

  this.queue = [];
  var context = this;
  socket.on('addVideo', function(data) {
    context.queue.push(data);
    console.log(context.queue);
    $rootScope.$emit('addToQueue', context.queue);
  })

  this.getData = function(){
    return this.queue;
  }

}])


.controller('YouTubeController', ['$scope', 'VideoService', '$rootScope', function($scope, VideoService, $rootScope){

  $scope.list = VideoService.queue;
  $rootScope.$on('addToQueue', function(){
    $scope.$apply(function() {
      $scope.list = VideoService.queue;
    });
  });

}])




