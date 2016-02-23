angular.module('chat', [])

.controller('chatController', function($scope){

  $scope.messages = [];

  $scope.send = function(msg){
    console.log(msg);
    socket.emit('send', msg)
  };

  socket.on('sent', function(data){
    $scope.$apply(function() {
      $scope.messages.push(data);
      $scope.message = null;
    });
  });

});