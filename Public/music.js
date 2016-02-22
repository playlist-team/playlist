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

.service('VideoService', ['$window','$rootScope', function($window, $rootScope){
  this.player;
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
    $rootScope.$apply();
  };

  function onPlayerReady (event)  {
    event.target.playVideo();
    $rootScope.$apply();
  };

  this.done = false;
  function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED && !done) {
      setTimeout(stopVideo, 6000);
      this.done = true;
    }
  };

  function stopVideo() {
    this.player.stopVideo();
    $rootScope.$apply();
  };

}])


.controller('YouTubeController', ['$scope', 'VideoService', function($scope, VideoService){

  //VideoService.onPlayerReady();

  $scope.message = 'This is working!';
  $scope.queue = [];
  socket.on('addVideo', function(data) {
    $scope.$apply(function() {
      $scope.queue.push(data);
    })
    console.log($scope.queue);
  })



}])




