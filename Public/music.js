angular.module('musicApp', ['ngRoute'])

.config(function($routeProvider, $locationProvider){
  $routeProvider

    .when('/', {
      templateUrl: '/youtube.html',
      controller: 'YouTubeController'
    })

    .otherwise({
      redirectTo: '/'
    })

  $locationProvider.html5Mode(true);

})

.controller('YouTubeController', ['$scope', function($scope){

  $scope.message = 'This is working!';

}])


