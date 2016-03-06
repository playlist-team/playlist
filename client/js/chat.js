angular.module('chat', ['ngSanitize', 'emojiApp'])
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
  $scope.emojiMessage={};
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

    // if message begins with '@', send direct message
    if (message[0] === "@"){
      var array = message.split(/\s/);
      var sendTo = array[0].substr(1);
      var message = array.slice(1).join(" ");
      sendPrivateMessage(sendTo, message);

    } else if (message[0] === "/"){
      var params = message.split(/\s/);
      var command = params.shift().substr(1);
      if (typeof $scope.slashCommands[command] === "function") {
        $scope.slashCommands[command].apply(null, params);
      } else {
        socket.emit('errorMessage', { 
          message: "Error: Could not find command " + command + ".",
          username: 'PlayList chatBot'
        });
      }
    } else {

      socket.emit('sendMessage', { message: message, 
                                 username: $scope.username, 
                                 time: $scope.time });

      if (message === "meow") {
        $scope.easterEgg();
      }
    }

    $('#messageDiv').html("");

    function sendPrivateMessage(sendTo, message){
      // notify user if they have not chosen a specific username
      console.log('send '+ message + ' to '+ $scope.username);
      if ($scope.username === 'anonymous'){
        socket.emit('errorMessage', { message: "Error: Must have a unique username to send private messages.",
                                    username: 'PlayList ChatBot'});
        return;
      }
      if (sendTo === 'anonymous'){
        socket.emit('errorMessage', { message: "Error: Can only send private messages to users with unique usernames.",
                                    username: 'PlayList ChatBot'});
        return;
      }
      // sends the private message is username is found
      for (var key in $scope.usernameList){
        if ($scope.usernameList[key] === sendTo){
          socket.emit('privateMessage', { sendToSocketId: key, 
                                          message: message,
                                          time: $scope.time,
                                          username: $scope.username });
          return;
        }
      }
      // Notify user if username was not found
      socket.emit('errorMessage', { message: "Error: Username is not found.",
                                    username: 'PlayList ChatBot'});
    }
  };

  //functions for slash commands
  $scope.slashCommands = {
    math: function () {
      var calc = Array.prototype.join.call(arguments, " ");
      var ans = math.eval(calc);
      socket.emit('sendMessage', { 
        message: calc + ' = ' + ans, 
        username: 'MathBot', 
        time: $scope.time 
      });
    },
    downvote: function () {
      socket.emit('downVote');
    },
    upvote: function () {
      socket.emit('upVote');
    }, 
    clear: function () {
      $scope.messages = [];
    },
    clearLog: function () {
      socket.emit('sendClear');
    },
    help: function () {
      socket.emit('sendAlert', { 
        message: 'Hey! Welcome to PlayList.',
        time: $scope.time,
        username: 'HelpBot' 
      });
      socket.emit('sendAlert', { 
        message: 'Here is a list of commands you can use:',
        time: $scope.time,
        username: 'HelpBot' 
      }); 
      socket.emit('sendAlert', { 
        message: '> /help : displays this help menu',
        time: $scope.time,
        username: 'HelpBot' 
      }); 
      socket.emit('sendAlert', { 
        message: '> /clear : clears the chat window',
        time: $scope.time,
        username: 'HelpBot' 
      });
      socket.emit('sendAlert', {
        message: '> /clearLog: clears the log window',
        time: $scope.time,
        username: 'HelpBot'
      });
      socket.emit('sendAlert', { 
        message: '> /math [math operations]: performs math',
        time: $scope.time,
        username: 'HelpBot' 
      });
      socket.emit('sendAlert', { 
        message: '> /upvote : upvotes the currently playing video',
        time: $scope.time,
        username: 'HelpBot' 
      }); 
      socket.emit('sendAlert', { 
        message: '> /downvote : downvotes the currently playing video',
        time: $scope.time,
        username: 'HelpBot' 
      }); 
    }
  };

  //Hide emoji popup when chat message changes
  $scope.$watch(
    function () { 
      return $('#messageDiv').html(); 
    }, function () {
      if ($('#emojibtn').hasClass('on')) {
        $('#emojibtn').click();
      }
  });

  //Receive new messages from server
  socket.on('chatMessage', function(data) {
    $scope.getCurrentTime();
    $scope.$apply(function() {
      data.time = $scope.time;
      $scope.messages.push(data);
    })
  });
  
  

  //Receive users currently connected from server
  socket.on('usersOnline', function(users) {
    $scope.$apply(function(){
      $scope.usernameList = users;
      $scope.usersConnected = Object.keys(users).length;
    });
  });

})
.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown", function(e) {
            if(e.which === 13) {
                scope.$apply(function(){
                    scope.$eval(attrs.ngEnter, {'e': e});
                });
                e.preventDefault();
            }
        });
    };
});