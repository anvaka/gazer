'use strict';

describe('Controller: CostarsCtrl', function () {

  // load the controller's module
  beforeEach(module('githubStarsApp'));

  var CostarsCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CostarsCtrl = $controller('CostarsCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
