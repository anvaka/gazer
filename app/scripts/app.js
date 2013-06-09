'use strict';
angular.module('githubStarsApp', ['ngCookies', 'githubStarsApp.directives'])
  .config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider.when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/oauth', {
        templateUrl: 'views/oauth.html',
        controller: 'OauthCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  }]);
