'use strict';

angular.module('githubStarsApp')
  .factory('precalculator', function ($http) {
    var endpoint = 'http://s3.amazonaws.com/github_yasiv/out/';
    return {
      getPrecalculatedRecommendation: function (projectName) {
        return $http.get(endpoint + projectName + '.json')
          .then(function (res) {
            return res.data && res.data.map(function (r, idx) {
              // unpack compressed records into object with meaningful names
              return {
                name : r.n,
                description: r.d,
                watchers: r.w,
                rate: r.r,
                place: idx + 1
              };
            });
          });
      }
    };
  });
