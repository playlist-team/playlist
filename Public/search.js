angular.module('search', [])

.directive('searchDirective', function() {
  return {
    restrict: "E",
    scope: {
      show: "="
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
    template: "<div class='ng-modal' ng-show='show'><div class='ng-modal-overlay' ng-click='hideResults()'></div><div class='ng-modal-dialog' ng-style='dialogStyle'><div class='ng-modal-close' ng-click='hideResults()'>X</div><div class='ng-modal-dialog-content' ng-transclude></div></div></div>"
  }
})

.controller('SearchController', ['$scope', '$window', 'SearchFactory', function($scope, $window, SearchFactory){

  $scope.searchList;
  $scope.getSearch = function() {
    SearchFactory.fetchSearch($scope.field, function(results) {
      console.log(results.data.items)
      $scope.searchList = results.data.items;
    });
  }

  $scope.enqueue = function(thumbnail){
    socket.emit('enqueue', { id: thumbnail.id.videoId,
                             title: thumbnail.snippet.title,
                             thumbnail: thumbnail.snippet.thumbnails.default.url,
                             username: $window.username,
                             socket: socket.id });
  }

  $scope.showResults = false;
  $scope.toggleResults = function() {
    $scope.showResults = !$scope.showResults;
  };

}])

.factory('SearchFactory', ['$http', function($http) {

  var fetchSearch = function(query, callback) {
    return $http.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: "AIzaSyDxx1rrqR-q7Tcfkz0MqII6sO2GQpONrGg",
        part: "snippet",
        type: "video",
        q: query,
        maxResults: 5,
        order: "viewCount",
        publishedAfter: "2000-01-01T00:00:00Z"
      }
    }).then(function(results){
      callback(results);
    })
  };

  return {
    fetchSearch: fetchSearch
  }

}])