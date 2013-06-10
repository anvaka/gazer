'use strict';

/**
 * Provides service to work with gihub API.
 * http://developer.github.com/v3/
 */
angular.module('githubStarsApp')
  .factory('githubClient', ['$rootScope', '$http', '$cookies', '$q', function ($rootScope, $http, $cookies, $q) {
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
        makeRequest = function (handler, paramsKeyValue) {
          paramsKeyValue = paramsKeyValue || {};
          paramsKeyValue.callback = 'JSON_CALLBACK';
          if ($cookies.accessToken) {
            paramsKeyValue.access_token = $cookies.accessToken;
          }
          var url = endpoint + '/' + handler + '?' + convertToQueryString(paramsKeyValue);

          return $http.jsonp(url).then(function (res) {
            var rateLimit = extractRateLimit(res);
            $rootScope.$broadcast('github:rateLimitChanged', rateLimit);

            return res.data;
          });
        },
        getAllPages = function (handler) {
          var pagesDownloaded = $q.defer();
          // very naive progress notification implementation.
          pagesDownloaded.promise.progress = function (callback) {
            pagesDownloaded.promise.reportProgress = callback;
            return pagesDownloaded.promise;
          };

          // forward declaration of functional expressions
          var onPageDownloaded, getOnePage, reportProgress;

          var getRelPage = function (metaLink, rel) {
            if (!metaLink) {
              return; // nothing to do here.
            }
            for(var i = 0; i < metaLink.length; ++i) {
              var record = metaLink[i];
              var recordLink = record[0];
              var recordRel = record[1] && record[1].rel;
              if (recordRel === rel) {
                  return recordLink.match(/\bpage=(\d+)/)[1];
              }
            }
          };

          reportProgress = function(progress) {
            if (typeof pagesDownloaded.promise.reportProgress === 'function') {
              pagesDownloaded.promise.reportProgress(progress);
            }
          };

          onPageDownloaded = function(res) {
            var data = res && res.data;
            if (!angular.isArray(data)) {
              pagesDownloaded.reject(data); // something goes wrong. Missing repository?
              return;
            }
            var metaLink = res.meta && res.meta.Link
            var next = getRelPage(metaLink, 'next'),
                total = getRelPage(metaLink, 'last');
            var stopNow = reportProgress({
              next: next,
              total: total,
              perPage: 100,
              data: res.data
            });
            if (!stopNow && next) {
              getOnePage(next);
            } else {
              pagesDownloaded.resolve(res);
            }
          };

          getOnePage = function(pageNumber) {
            makeRequest(handler, {
                per_page: 100,
                page: pageNumber
              }).then(onPageDownloaded);
          };

          // kick of pages download
          getOnePage(1);

          return pagesDownloaded.promise;
        };

    return {
      getUser: function () {
        return makeRequest('user').then(function (res) { return res.data; });
      },
      getStargazers: function(repoName) {
        return getAllPages('repos/' + repoName + '/stargazers');
      },
      getStarredProjects: function (userName) {
        return getAllPages('users/' + userName + '/starred');
      }
    }
  }]);
