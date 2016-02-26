angular.module('chat', [])

.directive('scrollDirective', function ($rootScope) {
  return {
    scope: {
      scrollDirective: '='
    },
    link: function (scope, element) {
      scope.$watchCollection('scrollDirective', function (newValue, oldValue) {
        if (newValue) {
          $(element).scrollTop($(element)[0].scrollHeight);
        }
      })
      $rootScope.$on('scrollDown', function() {
        setTimeout(function() {
          $(element).scrollTop($(element)[0].scrollHeight);
        }, 0);
      })
    }
  }
})

.controller('ChatController', function ($scope, $window, $rootScope){

  // $scope.messages = [ '','','','','','','','','','','','','','','','','',
  //                     '','','','','','','','','','','','','','','','','',
  //                     '','','','','','','','','','','','','','','','','',
  //                     '','','','','','','','','','','','','','','','','',
  //                     '','','','','','','','','','','','','','','','','',
  //                     '','','','','','','','' ];
  $scope.messages = []
  $scope.username = $window.username;
  $scope.useronline;
  $scope.tab='chat';
  $scope.chatstyle = {'background-color': 'white'};
  $scope.userstyle;

  $scope.changetab = function (tab){
    $scope.tab = tab;
    $rootScope.$emit('scrollDown');

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

    $scope.time = hours + ':' + min + ampm;
  };

  $scope.easterEgg = function () {
    setTimeout(function() { 
        socket.emit('sendMessage', { message: 'Easter egg detected.', 
                                 username: 'Easter bot', 
                                 time: $scope.time });
      }, 1000);
      setTimeout(function() {
        socket.emit('sendMessage', { message: 'Preparing meow mode.', 
                             username: 'Easter bot', 
                             time: $scope.time });
      }, 3000);
      setTimeout(function() {
        socket.emit('sendMessage', { message: 'MEOW MODE INITIALIZED', 
                             username: 'Easter bot', 
                             time: $scope.time })
      }, 5000)
      setTimeout(function() {
        socket.emit('easterEgg');
      }, 6000);
  }

  $scope.send = function (message){
    $scope.getCurrentTime();
    socket.emit('sendMessage', { message: message, 
                                 username: $scope.username, 
                                 time: $scope.time });
    if (message === "meow") {
      $scope.easterEgg();
    }
    $scope.message = null;
  };

  socket.on('messageSent', function (data){
    $scope.getCurrentTime();
    $scope.$apply(function() {
      data.time = $scope.time
      $scope.messages.push(data);
    })
  });

  socket.on('onlineusers', function (users){
    $scope.$apply(function(){
      $scope.useronline = users
    })
  });

})