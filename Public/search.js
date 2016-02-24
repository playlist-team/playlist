angular.module('search', [])

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
                             username: $window.username });
  }

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
