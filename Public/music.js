angular.module('musicApp', ['ngRoute'])

.config(function($routeProvider){
  $routeProvider

    .when('/', {
      templateUrl: '/youtube.html',
      controller: 'YouTubeController'
    })

})

.controller('YouTubeController', ['$scope', function($scope){

  $scope.message = 'This is working!';

}])


