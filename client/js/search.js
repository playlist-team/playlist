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
      }
    },
    transclude: true,
    template: "<div class='ng-modal' ng-show='show'><div class='ng-modal-overlay' ng-click='hideResults()'></div><div class='ng-modal-dialog' ng-style='dialogStyle'><div class='ng-modal-dialog-content' ng-transclude></div></div></div>"
  }
})

.controller('SearchController', ['$scope', '$window', 'SearchFactory', function($scope, $window, SearchFactory){

  $scope.searchList;

  $scope.getSearch = function() {
    SearchFactory.fetchSearch($scope.field, function(results) {
      $scope.searchList = results.data.items;
    });
  }

  //Sends video information to server
  $scope.enqueue = function(thumbnail) {
    socket.emit('enqueue', { id: thumbnail.id.videoId,
                             title: thumbnail.snippet.title,
                             thumbnail: thumbnail.snippet.thumbnails.default.url,
                             username: $window.username,
                             socket: socket.id });
  }

  $scope.showResults = false;

  //Toggles the modal view
  $scope.toggleResults = function() {
    $scope.showResults = !$scope.showResults;
  };

}])

//Search query from YouTube Data API
.factory('SearchFactory', ['$http', function($http) {

  var fetchSearch = function(query, callback) {
    return $http.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: "AIzaSyDxx1rrqR-q7Tcfkz0MqII6sO2GQpONrGg",
        part: "snippet",
        type: "video",
        videoType: "any",
        q: query,
        maxResults: 25,
        safeSearch: "none"
      }
    }).then(function(results){
      callback(results);
    })
  };

  return {
    fetchSearch: fetchSearch
  }

}])