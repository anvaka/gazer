'use strict';

angular.module('githubStarsApp')
  .factory('config', function () {
    var CLIENT_ID = 'cd357f9f712e559cea9f';
    return {
      clientId: CLIENT_ID,
      oauthArbiter: 'http://www.yasiv.com/oauth?service=github&clientId=' + CLIENT_ID
    };
  });
