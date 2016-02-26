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

  $scope.messages = [ '','','','','','','','','','','','','','','','','',
                      '','','','','','','','','','','','','','','','','',
                      '','','','','','','','','','','','','','','','','',
                      '','','','','','','','','','','','','','','','','',
                      '','','','','','','','','','','','','','','','','',
                      '','','','','','','',''];
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

  $scope.getCurrentTime = function () {
    var date = new Date();
    var hours = date.getHours();
    var min = date.getMinutes();
    var ampm;
    var time;

    if (hours < 12) {
      ampm = 'am';
    } else {
      ampm = 'pm';
    }

    if (hours > 12) {
      hours -= 12;
    } else if (hours === 0) {
      hours = 12;
    }

    if (min < 10) {
      min = '0' + min;
    }

    time = hours + ':' + min + ampm;
    $scope.time = hours + ':' + min + ampm;
  };

  $scope.send = function(message){
    $scope.getCurrentTime();
    socket.emit('sendMessage', { message: message, 
                                 username: $scope.username, 
                                 time: $scope.time });
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

