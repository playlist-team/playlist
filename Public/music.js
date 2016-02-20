angular.module('musicApp', ['ngRoute','chat'])

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


.controller('YouTubeController', ['$scope', function($scope){
  $scope.message = 'This is working!';
  $scope.queue = [];
  socket.on('addVideo', function(data) {
    $scope.$apply(function() {
      $scope.queue.push(data);
    })
    console.log($scope.queue);
  })

}])



