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
    link: function (scope, element, attrs, model) {
      $timeout(function () {
        debugger;
        element[0].focus();
      });
    }
  };
}])

