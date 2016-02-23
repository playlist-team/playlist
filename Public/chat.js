angular.module('chat', [])

.controller('ChatController', function($scope, $window){

  $scope.messages = [];
  $scope.username = $window.username;
  
  $scope.send = function(message){
    socket.emit('sendMessage', message)
    $scope.message = null;
  };

  socket.on('messageSent', function(data){
    $scope.$apply(function() {
      $scope.messages.push(data);
    })
  })
})