'use strict';

var app = angular.module('githubStarsApp.directives', []);
app.directive('userInfo', function () {
  return {
    restrict:'C',
    templateUrl:'template/userInfo.html',
    link: function() {
    }
  };
});
