angular.module('search', ['ngAnimate'])
//Load YouTube search results in a modal
.directive('searchDirective', function() {
  return {
    restrict: 'E',
    scope: {
      show: '='
    },
    replace: true,
    link: function(scope, element, attrs) {
      scope.dialogStyle = {};
      if (attrs.width) {
        scope.dialogStyle.width = attrs.width;
      }
      if (attrs.height) {
        scope.dialogStyle.height = attrs.height;
      }
      scope.hideResults = function() {
        scope.show = false;
      }
    },
    transclude: true,
    template: "<div class='ng-modal' ng-show='show'><div class='ng-modal-overlay' ng-click='hideResults()'></div><div class='ng-modal-dialog' ng-style='dialogStyle'><div class='ng-modal-dialog-content' ng-transclude></div></div></div>"
  }
})

.controller('SearchController', ['$scope', 'SearchFactory', '$rootScope', function($scope, SearchFactory, $rootScope){

  $scope.searchList;
  $scope.image = './img/soundcloud.png';
  $scope.yt = './img/yt.jpg';
  $scope.sc = '/img/sc.jpg';

  $scope.toggleIcon = function() {
    if ($scope.image === './img/soundcloud.png') {
      $scope.image = './img/youtube.png'
    } else {
      $scope.image = './img/soundcloud.png'
    }
  }

  $scope.searchQuery = function() {
    if ($scope.image === './img/soundcloud.png') {
      $scope.getSound();
    } else {
      $scope.getSearch();
    }
  }

  //Retrieve and populate scope with YouTube search results
  $scope.getSearch = function() {
    SearchFactory.fetchSearch($scope.field, function(results) {
      $scope.searchList = results.data.items;
    });
  }

  $scope.getSound = function() {
    SearchFactory.fetchSound($scope.field).then(function(results) {
      if (Array.isArray(results)) {
        $scope.searchList = results;
      } else {
        $scope.searchList = [results];
      }
    });
  }

  //Sends video information to server
  $scope.enqueue = function(thumbnail) {
    if (thumbnail.id.videoId) {
      SearchFactory.fetchResource(thumbnail.id.videoId, function(result) {
        var video = result.data.items[0];
        var length = video.contentDetails.duration.split(/[A-Za-z]/);
        var seconds = (Number(length[2]) * 60) + Number(length[3]);
        $rootScope.socket.emit('enqueue', { id: video.id,
                                 title: video.snippet.title,
                                 thumbnail: video.snippet.thumbnails.default.url,
                                 username: $rootScope.username,
                                 socket: $rootScope.socket.id, 
                                 duration: seconds,
                                 soundcloud: false });
      });
    } else {
      $rootScope.socket.emit('enqueue', {
        id: thumbnail.uri,
        title: thumbnail.title,
        thumbnail: thumbnail.artwork_url,
        username: $rootScope.username,
        socket: $rootScope.socket.id,
        duration: thumbnail.duration,
        soundcloud: true
      });
    };
  };

  $scope.showResults = false;

  //Toggles the modal view
  $scope.toggleResults = function() {
    $scope.showResults = !$scope.showResults;
  };

}])

//Search query from YouTube Data API
.factory('SearchFactory', ['$http', '$q', function($http, $q) {

  var deferred = $q.defer();

  var fetchSearch = function(query, callback, token) {
    var index = query.indexOf('&');

    if(index !== -1) {
      query = query.slice(0, index);
    }

    return $http.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        pageToken: token || "",
        key: "AIzaSyDxx1rrqR-q7Tcfkz0MqII6sO2GQpONrGg",
        part: "snippet",
        type: "video",
        videoType: "any",
        q: query,
        maxResults: 50,
        safeSearch: "none"
      }
    }).then(function(results) {
        callback(results);
    })
  };

  var fetchSound = function(query) {
    deferred = $q.defer();
    if (query.indexOf('soundcloud.com') !== -1) {
      SC.get('/resolve/?url=' + query, {limit: 1}, function(result) {
        deferred.resolve(result);
      })
    } else {
      SC.get('/tracks', {
        q: query,
        limit: 50
      }, function(results){
        deferred.resolve(results);
      });
    }
    return deferred.promise;
  }

  var fetchResource = function(videoId, callback) {
    return $http({
      method: 'GET',
      url: 'https://www.googleapis.com/youtube/v3/videos?id=' + videoId + '&key=AIzaSyDxx1rrqR-q7Tcfkz0MqII6sO2GQpONrGg&part=snippet,contentDetails'
    }).then(function(result) {
        callback(result);
    })
  }
  return {
    fetchSearch: fetchSearch,
    fetchSound: fetchSound,
    fetchResource: fetchResource
  }

}])