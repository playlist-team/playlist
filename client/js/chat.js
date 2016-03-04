angular.module('chat', ['ngSanitize'])
//Directive to auto scroll chat content to bottom when new message is sent
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

  //Receives and assigns username from server
  socket.on('setUser',function(username){
    $scope.username = username;
  });

  $scope.messages = [];
  $scope.usernameList;
  $scope.tab = 'chat';
  $scope.chatStyle = {'background-color': 'inherit'};
  $scope.userStyle;

  //Switch between users and chat tab
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

  //Send message to server
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

  //Recieve new messages from server
  socket.on('chatMessage', function(data) {
    $scope.getCurrentTime();
    $scope.$apply(function() {
      data.time = $scope.time;
      $scope.messages.push(data);
    })
  });
  
  //Receive new user activity messages from server
  socket.on('activityMessage', function(data) {
    var message;
    
    if(data.action === 'added') {
      message = { message: $scope.username + ' ' + data.action + ' ' + data.title + ' to queue.' }
    } else if (data.action === 'removed') {
      message = { message: $scope.username + ' ' + data.action + ' ' + data.title + ' from queue.' }
    } else {
      message = { message: $scope.username + ' ' + data.action + ' ' + data.title + '.'};
    }
    
    $scope.$apply(function() {
      $scope.messages.push(message);
    });
  });

  //Receive users currently connected from server
  socket.on('usersOnline', function(users) {
    $scope.$apply(function(){
      $scope.usernameList = users;
      $scope.usersConnected = Object.keys(users).length;
    });
  });

});