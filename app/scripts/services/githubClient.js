'use strict';

/**
 * Provides service to work with gihub API.
 * http://developer.github.com/v3/
 */
angular.module('githubStarsApp')
  .factory('githubClient', ['$rootScope', '$http', '$cookies','$q', 'progressingPromise', 'cacheService', '$timeout', function ($rootScope, $http, $cookies, $q, progressingPromise, cacheService, $timeout) {
    var endpoint = 'https://api.github.com',
        extractRateLimit = function (githubResponse) {
          var meta = githubResponse && githubResponse.data && githubResponse.data.meta;
          if (meta) {
            return {
              limit: parseInt(meta['X-RateLimit-Limit'], 10) || 0,
              remaining: parseInt(meta['X-RateLimit-Remaining'], 10) || 0
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
        makeRequest = function (handler, paramsKeyValue, waitTime) {
          paramsKeyValue = paramsKeyValue || {};
          paramsKeyValue.callback = 'JSON_CALLBACK';
          if ($cookies.accessToken) {
            paramsKeyValue.access_token = $cookies.accessToken;
          }
          var url = endpoint + '/' + handler + '?' + convertToQueryString(paramsKeyValue);

          var dataReceived = $q.defer();
          $http.jsonp(url).then(function (res) {
            var rateLimit = extractRateLimit(res);
            $rootScope.$broadcast('github:rateLimitChanged', rateLimit);

            var status = res.data.meta && res.data.meta.status;
            var rateLimitExceeded = (status === 403 && rateLimit.remaining === 0);
            if (rateLimitExceeded) {
              // If we have exceeded our rate limit, lets enter into polling mode
              // before we can satisfy the promise. Polling interval starts from 10
              // seconds and increases twice every time, but is capped by 30 minutes
              waitTime = (waitTime || 5) * 2;
              waitTime = Math.min(waitTime, 30 * 60);

              var retryDefer = $q.defer();
              $timeout(function (){
                makeRequest(handler, paramsKeyValue, waitTime).then(function (result) {
                  dataReceived.resolve(result);
                }, function (reason) {
                  dataReceived.reject(reason);
                });
              }, waitTime * 1000);
            } else if (status === 200) {
              dataReceived.resolve(res.data);
            } else {
              dataReceived.reject({
                statusCode: status,
                response: res.data
              });
            }
          });
          return dataReceived.promise;
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
        // TODO: this function and getStarredProjects() below are very similar
        // in their cache control flow. Consider refactoring this.
        var download = progressingPromise.defer();
        // when we don't have a record for this repository - go to GitHub:
        var cacheMiss = function () {
          getAllPages('repos/' + repoName + '/stargazers', shrinkPattern)
            .progress(function (report) {
              return download.reportProgress(report);
            }).then(function (stargazers) {
              cacheService.saveProjectFollowers(repoName, stargazers);
              download.resolve(stargazers);
              return stargazers;
            }, function (err) {
              download.reject(err);
            });
        };
        var cacheHit = function (cache) {
          download.reportProgress({
            nextPage: 0,
            totalPages: 0,
            perPage: cache.followers.length,
            data: cache.followers
          });
          $timeout(function () {
            download.resolve(cache.followers);
          });
        };

        cacheService.getProjectFollowers(repoName).then(cacheHit, cacheMiss);
        return download.promise;
      },

      getStarredProjects: function (userName, shrinkPattern) {
        var download = progressingPromise.defer();
        // go to GitHub when the record is not found in the cache:
        var cacheMiss = function () {
          getAllPages('users/' + userName + '/starred', shrinkPattern)
            .progress(function (report) {
              return download.reportProgress(report);
            }).then(function (starredProjects) {
              cacheService.saveStarredProjects(userName, starredProjects);
              download.resolve(starredProjects);
              return starredProjects;
            }, function (err) {
              download.reject(err);
            });
        };
        // otherwise pretend we are doing regular progress notification.
        var cacheHit = function (starredProjects) {
          download.reportProgress({
            nextPage: 0,
            totalPages: 0,
            perPage: starredProjects.length,
            data: starredProjects
          });
          $timeout(function () {
            download.resolve(starredProjects);
          });
        };

        cacheService.getStarredProjects(userName).then(cacheHit, cacheMiss);

        return download.promise;
      }
    };
  }]);
