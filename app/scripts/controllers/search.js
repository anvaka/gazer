'use strict';

/**
* A controller for the search box
*/
angular.module('githubStarsApp')
  .controller('SearchCtrl', ['$scope', '$location', function ($scope, $location) {
    var availableSearches = [ {
          name: "Co-Stars",
          description: "Finds the most starred projects among stargazers of project X",
          help: "Repo. E.g. anvaka/vivagraphjs",
          route: "costars"
        }];
    $scope.searchText = $location.search().q || '';
    $scope.searches = availableSearches;
    $scope.currentSearch = availableSearches[0];
    $scope.search = function () {
      var searchText = $scope.searchText;
      $location.search('q', searchText).path($scope.currentSearch.route);
    };
  }]);
