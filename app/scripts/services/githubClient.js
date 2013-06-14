'use strict';

/**
 * Provides service to work with gihub API.
 * http://developer.github.com/v3/
 */
angular.module('githubStarsApp')
  .factory('githubClient', ['$rootScope', '$http', '$cookies','$q', 'progressingPromise', function ($rootScope, $http, $cookies, $q, progressingPromise) {
    var endpoint = 'https://api.github.com',
        extractRateLimit = function (githubResponse) {
          var meta = githubResponse && githubResponse.data && githubResponse.data.meta;
          if (meta) {
            return {
              limit: meta['X-RateLimit-Limit'] || 0,
              remaining: meta['X-RateLimit-Remaining'] || 0
            };
          }
        },
        convertToQueryString = function (obj) {
          var queryString = [];
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              queryString.push(key + '=' + encodeURIComponent(obj[key]));
            }
          }
          return queryString.join('&');
        },

        /**
        * Makes single request to GitHub endpoint, extracts requests limit
        * info, and checks response code.
        */
        makeRequest = function (handler, paramsKeyValue) {
          paramsKeyValue = paramsKeyValue || {};
          paramsKeyValue.callback = 'JSON_CALLBACK';
          if ($cookies.accessToken) {
            paramsKeyValue.access_token = $cookies.accessToken;
          }
          var url = endpoint + '/' + handler + '?' + convertToQueryString(paramsKeyValue);

          return $http.jsonp(url).then(function (res) {
            var status = res.data.meta && res.data.meta.status;
            if (status !== 200) {
              $q.reject({
                statusCode: status,
                response: res
              });
            }

            var rateLimit = extractRateLimit(res);
            $rootScope.$broadcast('github:rateLimitChanged', rateLimit);

            return res.data;
          });
        },

        shrinker = function(originalObj, requiredFields) {
          if (requiredFields) {
            var result = {};
            for (var key in requiredFields) {
              if (requiredFields.hasOwnProperty(key)) {
                result[key] = originalObj[key];
              }
            }
            return result;
          }
          return originalObj;
        },
        getRelPage = function (metaLink, rel) {
          if (!metaLink) {
            return; // nothing to do here.
          }
          for(var i = 0; i < metaLink.length; ++i) {
            var record = metaLink[i];
            var recordLink = record[0];
            var recordRel = record[1] && record[1].rel;
            if (recordRel === rel) {
              var count = recordLink.match(/\bpage=(\d+)/)[1];
              if (count) {
                return parseInt(count, 10);
              }
            }
          }
        },
        /**
        * Gets all pages from meta information of github request
        */
        getAllPages = function (handler, shrinkPattern) {
          var download = progressingPromise.defer();
          // forward declaration of functional expressions
          var reportProgressAndDownloadNextPage, getOnePage;

          var result = [];
          reportProgressAndDownloadNextPage = function(res) {
            var data = res && res.data;
            if (!angular.isArray(data)) {
              download.reject(data); // something goes wrong. Missing repository?
              return;
            }
            var metaLink = res.meta && res.meta.Link;
            var next = getRelPage(metaLink, 'next'),
                total = getRelPage(metaLink, 'last');
            var progressData = [];
            var shrinkedObj;
            for (var i = 0; i < res.data.length; ++i) {
              shrinkedObj = shrinker(res.data[i], shrinkPattern);
              progressData.push(shrinkedObj);
              result.push(shrinkedObj);
            }

            var stopNow = download.reportProgress({
              nextPage: next,
              totalPages: total,
              perPage: 100,
              data: progressData
            });
            if (stopNow) {
              download.reject('Requested to stop');
            } else if (next) {
              getOnePage(next);
            } else {
              download.resolve(result);
            }
          };

          getOnePage = function(pageNumber) {
            makeRequest(handler, {
                per_page: 100,
                page: pageNumber
              }).then(reportProgressAndDownloadNextPage, function (err) {
                // if something goes wrong here, lets reject the entire process
                download.reject(err);
              });
          };

          // kick of pages download
          getOnePage(1);

          return download.promise;
        };

    return {
      getUser: function () {
        return makeRequest('user').then(function (res) { return res.data; });
      },
      getStargazers: function(repoName, shrinkPattern) {
        return getAllPages('repos/' + repoName + '/stargazers', shrinkPattern);
      },
      getStarredProjects: function (userName, shrinkPattern) {
        return getAllPages('users/' + userName + '/starred', shrinkPattern);
      }
    };
  }]);
