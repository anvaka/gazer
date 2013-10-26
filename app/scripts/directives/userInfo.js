'use strict';

var app = angular.module('githubStarsApp.directives', []);
app.directive('userInfo', function () {
  return {
    restrict:'C',
    templateUrl:'template/userInfo.html',
    link: function() {
    }
  };
}).directive('defaultFocus', ['$timeout', function($timeout) {
  return {
    restrict:'C',
    link: function (scope, element) {
      $timeout(function () {
        element[0].focus();
      });
    }
  };
}]);

