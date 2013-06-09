'use strict';

angular.module('githubStarsApp')
  .controller('UserInfoCtrl', ['$scope', 'githubClient', 'config', function ($scope, githubClient, config) {
    githubClient.getUser().then(function (user) {
      $scope.isConnected = true;
      $scope.isAuthenticated = user.hasOwnProperty('login');
      $scope.user = user;
    });

    $scope.$on('github:rateLimitChanged', function (e, rate) {
      $scope.requestsRemained = rate.remaining + '/' + rate.limit;
    });
    $scope.clientId = config.clientId;

    $scope.requestsRemained = 10;
  }]);
