'use strict';

angular.module('githubStarsApp')
  .controller('OauthCtrl', ['$scope', '$http', 'config', '$cookies', function ($scope, $http, config, $cookies) {
    var codeMatch = window.location.href.match(/\bcode=([^#?&]+)/);
    if (codeMatch) {
      $http.jsonp(config.oauthArbiter + '&code=' + codeMatch[1] + '&callback=JSON_CALLBACK')
           .then(function(res){
             var accessToken = res.data && res.data.access_token;
             if (accessToken) {
               $cookies.accessToken = accessToken;
               // github sends code in the search argument, we need to remove
               // it and navigate to default screen:
               window.location.href = window.location.href.split('?')[0];
             }
           })
    }
  }]);
