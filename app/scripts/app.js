'use strict';
angular.module('githubStarsApp', ['ui.bootstrap', 'ngCookies', 'githubStarsApp.directives', 'githubStarsApp.directives.numericInput'])
  .config(['$routeProvider', '$locationProvider', function ($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/oauth', {
        templateUrl: 'views/oauth.html',
        controller: 'OauthCtrl'
      })
      .when('/costars', {
        templateUrl: 'views/costars.html',
        controller: 'CostarsCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  }]);
