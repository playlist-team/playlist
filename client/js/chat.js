angular.module('chat', ['ngSanitize'])
//auto scroll chat content to bototm when there's new message
.directive('scrollDirective', function ($rootScope) {
  return {
    scope: {
      scrollDirective: '='
    },
    link: function (scope, element) {
      scope.$watchCollection('scrollDirective', function (newValue) {
        if (newValue) {
          $(element).scrollTop($(element)[0].scrollHeight);
        }
      });

      $rootScope.$on('scrollDown', function() {
        setTimeout(function() {
          $(element).scrollTop($(element)[0].scrollHeight);
        }, 0);
      });
    }
  }
})

.controller('ChatController', function ($scope, $window, $rootScope){

  socket.on('setUser',function(username){
    $scope.username = username;
  });

  $scope.messages = [];
  $scope.usernameList;
  $scope.tab = 'chat';
  $scope.chatStyle = {'background-color': 'inherit'};
  $scope.userStyle;

  //change tabs on click (chat & user online)
  $scope.changeTab = function(tab) {
    $scope.tab = tab;
    $rootScope.$emit('scrollDown');

    if($scope.tab=='chat') {
      $scope.chatStyle = {'background-color': 'inherit'};
      $scope.userStyle = {};
    } else if ($scope.tab=='users') {
      $scope.userStyle = {'background-color': 'hsl(227, 8%, 52%'};
      $scope.chatStyle = {};
    }
  }

  //get current time of user for chat
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
  //key word is meow for easter effect =D
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

  //send message from each user
  $scope.send = function(message) {
    $scope.getCurrentTime();
    socket.emit('sendMessage', { message: message, 
                                 username: $scope.username, 
                                 time: $scope.time });

    if (message === "meow") {
      $scope.easterEgg();
    }
    
    $scope.message = null;
  }

  //recieve new message from socker when new message comes in
  socket.on('chatMessage', function(data) {
    //get local time for each user
    $scope.getCurrentTime();
    $scope.$apply(function() {
      data.time = $scope.time;
      $scope.messages.push(data);
    })
  });

  //get new updates on newest users from socket
  socket.on('usersOnline', function(users) {
    $scope.$apply(function(){
      $scope.usernameList = users;
      $scope.usersConnected = Object.keys(users).length;
    });
  });

});