'use strict';

/**
* Provides a service to executed N promises, with a limit on number of
* unresolved promisses running in parallel.
*
* E.g. imagine you want to process 100 images in parallel, but do not
* want to create 100 web workers at the same time.
*
* var process = promisingStream.process(
*   imagesArray,          // raw images to process
*   function(oneImage) {  // this is our promise factory:
*     return promiseWhichCaclculatesImageOnWebWeorker(oneImage);
*   },
*   2                     // run only two concurrent (unresolved) promises at a time
* ).promise.then(allImagesProcessedCallback);
*
* yes, it returns not a promise.. maybe not a good idea, but I want to be able to
* reject the entire process when user don't need. If there is a better way - let me know :)!
**/
angular.module('githubStarsApp')
.factory('promisingStream', ['$q', function ($q) {
  function process(objects, promiseFactory, activeLimit) {
    var deferred = $q.defer(),
        activeCounter = 0,
        successes = [],
        errors = [],
        lastScheduled = 0,
        cancelRequested = false,
        scheduleNextPromise = function () {
          var i = lastScheduled;
          if (i < objects.length && !cancelRequested) {
            var promise = promiseFactory(objects[i]);
            promise.then(saveResult(successes, i), saveResult(errors, i));
            ++lastScheduled;
            ++activeCounter;
          }
        },
        saveResult = function (writeTo, i) {
          return function (result) {
            writeTo[i] = result;
            if (cancelRequested) {
              return $q.reject('Cancel requested');
            }
            scheduleNextPromise();
            if (!(--activeCounter)) {
              deferred.resolve({
                results: successes,
                errors: errors
              });
            }
          };
        };

    var upperBound = Math.min(activeLimit, objects.length);
    for (var i = 0; i < upperBound; ++i) {
      scheduleNextPromise();
    }

    if (activeCounter === 0) {
      deferred.resolve({results: successes, errors: errors});
    }

    return {
      promise: deferred.promise,
      cancel : function () {
        cancelRequested = true;
      }
    };
  }

  return {
    process: process
  };
}]);
