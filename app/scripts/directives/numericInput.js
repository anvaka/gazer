'use strict';

var app = angular.module('githubStarsApp.directives.numericInput', []);
app.directive('numericInput', function () {
  return {
    require: 'ngModel',
    restrict: 'C',
    link: function (scope, element, attr, ngModelCtrl) {
      function fromUser(text) {
        var transformedInput = text.replace(/[^0-9]/g, '');
        if(transformedInput !== text) {
          ngModelCtrl.$setViewValue(transformedInput);
          ngModelCtrl.$render();
        }
        return transformedInput;
      }
      ngModelCtrl.$parsers.push(fromUser);
    }
  };
});
