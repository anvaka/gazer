'use strict';

/**
* Augments $q promises with progress notifiction. Very naive implementation
*/
angular.module('githubStarsApp')
  .factory('progressingPromise', ['$q', function ($q) {
    var attachProgress = function (deferred) {
      var progressCallbacks = [];
      var promise = deferred.promise;

      // let clients subscribe to our progress notification
      promise.progress = function (callback) {
        if (typeof callback === 'function') {
          progressCallbacks.push(callback);
        }
        return promise; // support chaining for progress
      };
      // clients can use deferred to report their progress 
      // to subscribers. This calls pending listeners synchronously, which
      // is not a good design pattern. But I told you this is very naive implementation
      deferred.reportProgress = function () {
        var shouldCancelCalculation = false;
        // we want to iterate over all progress listeners, if one of them
        // returns true, meaning "Cancel the process", we want to notify ramining
        // listeners
        for(var i = 0; i < progressCallbacks.length; ++i) {
          shouldCancelCalculation = progressCallbacks[i].apply(null, arguments) ||
                                    shouldCancelCalculation;
        }
        return shouldCancelCalculation;
      };
    };
    return {
      defer: function () {
        var deferred = $q.defer();
        attachProgress(deferred);
        return deferred;
      }
    };
  }]);
