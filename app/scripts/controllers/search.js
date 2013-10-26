'use strict';

/**
* A controller for the search box
*/
angular.module('githubStarsApp')
  .controller('SearchCtrl', ['$scope', '$location', '$http', function ($scope, $location, $http) {
    var knownRepositories = [];
    $scope.searchText = $location.search().q || '';
    $scope.search = function () {
      var searchText = $scope.searchText;
      $location.search('q', searchText).path('costars');
    };
    $scope.repositoriesLike = function(name) {
      // slow but clean way to find all matches with correct priority on
      // user name first, then repository name:
      return knownRepositories.filter(function(x) {
        return x.indexOf(name) !== -1;
      }).sort(function(x, y) {
        return x.indexOf(name) - y.indexOf(name);
      }).splice(0, 12);
    };

    $http.get('http://s3.amazonaws.com/github_yasiv/projects/projects.json').success(function(data) {
      knownRepositories = data;
    });
  }]);
