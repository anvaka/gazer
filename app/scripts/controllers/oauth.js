'use strict';

/** 
* Github authentication takes two steps:
* 1. Github provides an app with temporary code when user grants access
* 2. Application signs the code with secret key.
* This controller handles response from step 1 and requests arbiter to sign
* the temporary code with the secret key
*/
angular.module('githubStarsApp')
  .controller('OauthCtrl', ['$scope', '$http', 'config', '$cookies', function ($scope, $http, config, $cookies) {
    var codeMatch = window.location.href.match(/\bcode=([^#?&]+)/);
    // todo: handle errors properly
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
