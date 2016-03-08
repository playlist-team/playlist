angular.module('search', [])
//:oad YouTube search results in a modal
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
      };
    },
    transclude: true,
    template: "<div class='ng-modal' ng-show='show'><div class='ng-modal-overlay' ng-click='hideResults()'></div><div class='ng-modal-dialog' ng-style='dialogStyle'><div class='ng-modal-dialog-content' ng-transclude></div></div></div>"
  };
})

.controller('SearchController', ['$scope', '$window', 'SearchFactory', function($scope, $window, SearchFactory){

  $scope.searchList;
  $scope.order = 'relevance'
  $scope.orderTitle = 'relevance';
  $scope.nextPage = null;
  $scope.prevPage = null;

  //Retrieve and populate scope with YouTube search results
  $scope.getSearch = function(token) {
    var order = $scope.order;
    SearchFactory.fetchSearch($scope.field, function(results) {
      $scope.searchList = results.data.items;
      
      if(results.data.nextPageToken) {
        $scope.nextPage = results.data.nextPageToken;
      } else {
        $scope.nextPage = null;
      }
      if(results.data.prevPageToken) {
        $scope.prevPage = results.data.prevPageToken;
      } else {
        $scope.prevPage = null;
      }
      
    }, order, token);
  };
  
  $scope.enqueue = function(thumbnail) {
    SearchFactory.fetchResource(thumbnail.id.videoId, function(result) {
      var video = result.data.items[0];
      var length = video.contentDetails.duration.split(/[A-Za-z]/);
      var seconds = (Number(length[2]) * 60) + Number(length[3]);
      socket.emit('enqueue', { id: video.id,
                               title: video.snippet.title,
                               thumbnail: video.snippet.thumbnails.default.url,
                               username: $window.username,
                               socket: socket.id, 
                               duration: seconds });
      socket.emit('sendLog', { action: 'added',
                                    title: video.snippet.title });
    });
  };

  $scope.showResults = false;

  //Toggles the modal view
  $scope.toggleResults = function() {
    $scope.showResults = !$scope.showResults;
  };
  
  //Changes order of search result
  socket.on('changeSearchOrder', function(data) {
    
    $scope.$apply(function() {
      $scope.order = data.order;
      $scope.orderTitle = data.title;
    });
  });

}])

//Search query from YouTube Data API
.factory('SearchFactory', ['$http', function($http) {

  var fetchSearch = function(query, callback, order, token) {
    return $http.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        pageToken: token || "",
        key: "AIzaSyDxx1rrqR-q7Tcfkz0MqII6sO2GQpONrGg",
        part: "snippet",
        type: "video",
        videoType: "any",
        q: query,
        order: order,
        maxResults: 25,
        safeSearch: "none"
      }
    }).then(function(results) {
        callback(results);
    });
  };

  var fetchResource = function(videoId, callback) {
    return $http({
      method: 'GET',
      url: 'https://www.googleapis.com/youtube/v3/videos?id=' + videoId + '&key=AIzaSyDxx1rrqR-q7Tcfkz0MqII6sO2GQpONrGg&part=snippet,contentDetails'
    }).then(function(result) {
        callback(result);
    });
  };
  return {
    fetchSearch: fetchSearch,
    fetchResource: fetchResource,
  };

}]);