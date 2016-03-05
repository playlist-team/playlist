angular.module('log', [])
.controller('LogController', function($scope, $window, $rootScope) {
  $scope.logs = [];
  
    socket.on('setUser',function(username){
    $scope.username = username;
  });
  
  //Get current time
  $scope.getCurrentTime = function() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var meridian;

    if (hours < 12) {
      meridian = 'am';
    } else {
      meridian = 'pm';
    }

    if (hours > 12) {
      hours -= 12;
    } else if (hours === 0) {
      hours = 12;
    }

    if (minutes < 10) {
      minutes = '0' + minutes;
    }

    $scope.time = hours + ':' + minutes + meridian;
  };
  
  // Receive new user activity messages from server
  socket.on('activityMessage', function(data) {
    var log;
    
    if(data.action === 'added') {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: ' to playlist',
              time: $scope.time };
              
    } else if (data.action === 'removed') {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: ' from playlist',
              time: $scope.time };
    } else if(data.action === 'has joined' || data.action === 'has left') {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: '',
              time: $scope.time };
    } else {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: '',
              time: $scope.time };  // case for upvote, downvote and skip
    }
    
    $scope.$apply(function() {
      $scope.logs.push(log);
    });
  });
  
});
  
