'use strict';

angular.module('githubStarsApp')
  .controller('MainCtrl', function ($scope) {
    $scope.requestsRemained = 10;
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
