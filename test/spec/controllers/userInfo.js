'use strict';

describe('Controller: UserInfoCtrl', function () {

  // load the controller's module
  beforeEach(module('githubStarsApp'));

  var UserInfoCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    UserInfoCtrl = $controller('UserInfoCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
