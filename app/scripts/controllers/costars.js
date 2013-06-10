'use strict';

angular.module('githubStarsApp')
  .controller('CostarsCtrl', ['$scope', '$routeParams', 'githubClient', function ($scope, $routeParams, githubClient) {
    $scope.log = [];
    var log = function (logName, msg) {
      $scope[logName] = msg;
    };

    // if we know what to search, let's find it:
    var projectName = $routeParams.q;
    // todo: convert this to workflow.
    if (projectName) {
      var projectsOccurances = {};
      var updateHistogram = function (foundProjects) {
        // todo: this could be done more efficiently with heap.
        for (var i = 0; i < foundProjects.length; ++i) {
          var projectName = foundProjects[i].full_name;
          if (projectsOccurances.hasOwnProperty(projectName)) {
            projectsOccurances[projectName] += 1;
          } else {
            projectsOccurances[projectName] = 1;
          }
        }
        var projects = Object.keys(projectsOccurances).sort(function(x, y) {
          return projectsOccurances[y] - projectsOccurances[x];
        });
        var limitTo = [];
        for (i = 0; i < 100; ++i) {
          limitTo.push({
            name : projects[i],
            count: projectsOccurances[projects[i]]
          });
        }
        $scope.projects = limitTo;
      };
      var processStarredProjects = function (followers) {
        var processNextUser = function () {
          if (followers.length) {
            var userName = followers.pop().login;
            var usersProjectsCount = 0;
            log('favoriteLog', "Processing projects starred by " + userName);
            githubClient.getStarredProjects(userName).progress(function (progressReport){
              usersProjectsCount += progressReport.data.length;
              updateHistogram(progressReport.data);
              log('favoriteLog', "Processing projects starred by " + userName + ' (' + usersProjectsCount + ')');
            }).then(function (data) {
              processNextUser();
            });
          }
        };
        processNextUser();
      };
      var foundFollowers = [];
      githubClient.getStargazers(projectName)
        .progress(function (progressReport) {
          foundFollowers = foundFollowers.concat(progressReport.data);
          log('followersLog', 'Gathering ' + projectName + ' followers: ' + foundFollowers.length);
        })
        .then(function(res) {
          log('followersLog', 'Found ' + foundFollowers.length + ' followers of ' + projectName);
          processStarredProjects(foundFollowers);
        });
    }
  }]);
