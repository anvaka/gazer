'use strict';

describe('Service: githubClient', function () {

  // load the service's module
  beforeEach(module('githubStarsApp'));

  // instantiate service
  var githubClient;
  beforeEach(inject(function (_githubClient_) {
    githubClient = _githubClient_;
  }));

  it('should do something', function () {
    expect(!!githubClient).toBe(true);
  });

});
