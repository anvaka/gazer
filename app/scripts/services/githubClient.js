'use strict';

/**
 * Provides service to work with gihub API.
 * http://developer.github.com/v3/
 */
angular.module('githubStarsApp')
  .factory('githubClient', ['$rootScope', '$http', '$cookies', function ($rootScope, $http, $cookies) {
    var endpoint = 'https://api.github.com',
        handlers = {
          user : 'user'
        },
        extractRateLimit = function (githubResponse) {
          var meta = githubResponse && githubResponse.data && githubResponse.data.meta;
          if (meta) {
            return {
              limit: meta['X-RateLimit-Limit'] || 0,
              remaining: meta['X-RateLimit-Remaining'] || 0
            };
          }
        },
        makeRequest = function (handler) {
          if (!handlers.hasOwnProperty(handler)) {
            throw new Error("Unknown github handler requested: " + handler);
          }
          var accessToken = $cookies.accessToken ? '&access_token=' + $cookies.accessToken : '';
          var url = endpoint + '/' + handlers[handler] + '?callback=JSON_CALLBACK' + accessToken;

          return $http.jsonp(url).then(function (res) {
            var rateLimit = extractRateLimit(res);
            $rootScope.$broadcast('github:rateLimitChanged', rateLimit);

            return res.data.data;
          });
        };

    return {
      getUser: function () {
        return makeRequest('user');
      }
    }
  }]);
