angular.module('chat', [])

.directive('scrollDirective', function() {
  return {
    scope: {
      scrollDirective: '='
    },
    link: function(scope, element) {
      scope.$watchCollection('scrollDirective', function (newValue) {
        if (newValue) {
          $(element).scrollTop($(element)[0].scrollHeight);
        }
      })
    }
  }
})
.controller('ChatController', function($scope, $window){

  $scope.messages = [];
  $scope.username = $window.username;
  $scope.useronline;

  $scope.send = function(message){
    socket.emit('sendMessage', { message: message, username: $scope.username });
    $scope.message = null;
  };

  socket.on('messageSent', function(data){
    $scope.$apply(function() {
      $scope.messages.push(data);
    })
  })

  socket.on('onlineusers', function(users){
    $scope.$apply(function(){
      $scope.useronline = users
      for(var user in users){
          console.log(users[user]+'*************')
      }
    })
  })

})

