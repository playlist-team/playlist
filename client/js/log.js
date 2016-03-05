angular.module('log', [])
.controller('LogController', function($scope, $window, $rootScope) {
  $scope.logs = [];
  
    socket.on('setUser',function(username){
    $scope.username = username;
  });
  
  // Receive new user activity messages from server
  socket.on('activityMessage', function(data) {
    var log;
    
    if(data.action === 'added') {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: ' to playlist' };
              
    } else if (data.action === 'removed') {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: ' from playlist' };
    } else if(data.action === 'has joined' || data.action === 'has left') {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: '' };
    } else {
      log = { username: data.username,
              action: data.action,
              title: data.title,
              message: '', };  // case for upvote, downvote and skip
    }
    
    $scope.$apply(function() {
      $scope.logs.push(log);
    });
  });
  
  socket.on('voteSkip', function(data) {
    $scope.$apply(function() {
      var log;
      
      log = { 
        title: data.title,
        message: 'was skipped by majority downvote' };
      
      $scope.logs.push(log);
    });
  });
  
});
  
