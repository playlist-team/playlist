angular.module('history', [])

.controller('HistoryController', function($scope, $window, $rootScope) {
  $scope.historyList = [];
  
  $scope.enqueue = function(video) {
    socket.emit('enqueueFromHistory', video);
    socket.emit('sendLog', { action: 'added',
                              title: video.title,
                            });
  };
  
  socket.on('addToHistory', function(video) {
    
    $scope.$apply(function() {
      $scope.historyList.unshift(video);
    });
    
  });
});