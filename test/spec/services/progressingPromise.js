'use strict';

describe('Service: progressingPromise', function () {

  // load the service's module
  beforeEach(module('githubStarsApp'));

  // instantiate service
  var progressingPromise;
  beforeEach(inject(function (_progressingPromise_) {
    progressingPromise = _progressingPromise_;
  }));

  it('should do something', function () {
    expect(!!progressingPromise).toBe(true);
  });

});
