'use strict';

angular.module('githubStarsApp')
  .factory('config', function () {
    return {
      clientId: 'cd357f9f712e559cea9f',
      oauthArbiter: 'http://www.yasiv.com/oauth?service=github'
    };
  });
