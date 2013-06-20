'use strict';

describe('Directive: numericInput', function () {
  beforeEach(module('githubStarsApp'));

  var element;

  it('should make hidden element visible', inject(function ($rootScope, $compile) {
    element = angular.element('<numeric-input></numeric-input>');
    element = $compile(element)($rootScope);
    expect(element.text()).toBe('this is the numericInput directive');
  }));
});
