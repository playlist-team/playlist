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
  $scope.tab='chat';
  $scope.chatstyle = {'background-color': 'white'};
  $scope.userstyle;


  $scope.changetab = function(tab){
    $scope.tab = tab;
    if($scope.tab=='chat'){
        $scope.chatstyle = {'background-color': 'white'};
        $scope.userstyle = {}
    }else if ($scope.tab=='users'){
        $scope.userstyle = {'background-color': 'white'};
        $scope.chatstyle = {}
    }
  }

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
    })
  })

})

