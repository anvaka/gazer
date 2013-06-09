'use strict';

describe('Directive: signin', function () {
  beforeEach(module('githubStarsApp'));

  var element;

  it('should make hidden element visible', inject(function ($rootScope, $compile) {
    element = angular.element('<signin></signin>');
    element = $compile(element)($rootScope);
    expect(element.text()).toBe('this is the signin directive');
  }));
});
