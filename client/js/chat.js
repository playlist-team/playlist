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
        var scrollHeight = $(element).prop('scrollHeight');
        $(element).animate({scrollTop: scrollHeight}, 500);
      });

      $rootScope.$on('scrollDown', function() {
        setTimeout(function() {
          $(element).scrollTop($(element)[0].scrollHeight);
        }, 0);
      });
    }
  }
})

.controller('ChatController', ['$scope', '$rootScope', 'GifFactory', function ($scope, $rootScope, GifFactory) {
  //Receives and assigns username from server
  $rootScope.socket.on('setUser',function(username) {
    $rootScope.username = username;
    $scope.username = username;
  });

  //Re-establish username handshake with server
  $rootScope.socket.on('comeback', function() {
    $rootScope.socket.emit('return', $scope.username);
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
      $rootScope.socket.emit('sendMessage', { message: 'EASTER EGG DETECTED', 
                                   username: 'easterbot', 
                                   time: $scope.time });
    }, 1000);

    setTimeout(function() {
      $rootScope.socket.emit('sendMessage', { message: 'PREPARING MEOW MODE', 
                                   username: 'easterbot', 
                                   time: $scope.time });
    }, 3000);

    setTimeout(function() {
      $rootScope.socket.emit('sendMessage', { message: 'MEOW MODE INITIALIZED', 
                                   username: 'easterbot', 
                                   time: $scope.time })
    }, 5000)

    setTimeout(function() {
      $rootScope.socket.emit('easterEgg');
    }, 6000);
  }

  $scope.getGif = function(tags, callback) {
    GifFactory.fetchGif(tags, function(result) {
      callback(result.data.data.image_original_url);
    })
  }

  $scope.getSticker = function(tags, callback) {
    GifFactory.fetchSticker(tags, function(result) {
      callback(result.data.data.image_original_url);
    })
  }

  //Send message to server
  $scope.send = function(message) {
    if (message[0] === '/') {
      if (message.indexOf('/gif') !== -1) {
        var tags = message.split(' ');
        tags.shift();
        $scope.getGif(tags, function(url) {
          $scope.getCurrentTime();
          $rootScope.socket.emit('sendMessage', {
            message: message + ' ▽',
            username: $scope.username,
            url: url,
            time: $scope.time
          })
        })
      } else if (message.indexOf('/peel') !== -1) {
        var tags = message.split(' ');
        tags.shift();
        $scope.getSticker(tags, function(url) {
          if (url === undefined) {
            $scope.getCurrentTime();
            $rootScope.socket.emit('sendMessage', {
              message: 'Sticker not found, try again.',
              username: 'playbot',
              time: $scope.time
            });
          } else {
            $scope.getCurrentTime();
            $rootScope.socket.emit('sendMessage', {
              message: message + ' ▽',
              username: $scope.username,
              url: url,
              time: $scope.time
            })
          }
        })
      } else if (message.indexOf('/help') !== -1) {

        var lines =
          "OPTIONS: \n" +
          "›› /help : display  the list of commands \n" +
          "›› /clear : clear the chat window \n" +
          "›› /gif [tags] : display a random gif \n" +
          "     i.e.  /gif wu tang clan \n" +
          "›› /peel [tags] : display a random sticker \n" +
          "     i.e.  /peel banana";

        $scope.getCurrentTime();


        var helpMessage = {
            username: 'playbot',
            time: $scope.time,
            message: lines,
            notification: true
        }

        $scope.messages.push(helpMessage);

      } else if (message.indexOf('/clear') !== -1) {
        $scope.messages = [];
      } else {
        var helpMessage = {
          username: 'playbot',
          time: $scope.time,
          message: message + " is not a valid command. Type /help to see a list of commands."
        }
        $scope.messages.push(helpMessage);
      }
    } else {
      $scope.getCurrentTime();

      $rootScope.socket.emit('sendMessage', { 
        message: message, 
        username: $scope.username, 
        time: $scope.time 
      });
    }

    if (message === "meow") {
      $scope.easterEgg();
    }
    
    $scope.message = null;
  }

  //Recieve new messages from server
  $rootScope.socket.on('chatMessage', function(data) {
    $scope.getCurrentTime();
    $scope.$apply(function() {
      data.time = $scope.time;
      $scope.messages.push(data);
    })
  });

  $rootScope.socket.on('joinMessage', function(data) {
    $scope.$apply(function() {
      $scope.messages.push(data);
    })
  });

  //Receive users currently connected from server
  $rootScope.socket.on('usersOnline', function(users) {
    $scope.$apply(function(){
      $scope.usernameList = users;
      $scope.usersConnected = Object.keys(users).length;
    });
  });

}])

.factory('GifFactory', ['$http', '$q', function($http, $q) {

  var deferred = $q.defer();

  var buildParameter= function(tags) {
    var parameter = "";
    for (var i = 0; i < tags.length - 1; i++) {
      parameter += tags[i] + '+';
    }
    parameter += tags[tags.length - 1];
    return parameter;
  };

  var fetchGif = function(query, callback) {
    var tag = buildParameter(query);
    return $http({
      method: 'GET',
      url: 'https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=' + tag
    }).then(function(result) {
      callback(result)
    })
  }

  var fetchSticker = function(query, callback) {
    var tag = buildParameter(query);
    return $http({
      method: 'GET',
      url: 'https://api.giphy.com/v1/stickers/random?api_key=dc6zaTOxFJmzC&tag=' + tag
    }).then(function(result) {
      callback(result);
    })
  }
  return {
    fetchGif : fetchGif,
    fetchSticker : fetchSticker
  }

}]);