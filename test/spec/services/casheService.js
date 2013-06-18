'use strict';

describe('Service: casheService', function () {

  // load the service's module
  beforeEach(module('githubStarsApp'));

  // instantiate service
  var casheService;
  beforeEach(inject(function (_casheService_) {
    casheService = _casheService_;
  }));

  it('should do something', function () {
    expect(!!casheService).toBe(true);
  });

});
