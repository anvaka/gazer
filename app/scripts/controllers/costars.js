'use strict';

angular.module('githubStarsApp')
  .controller('CostarsCtrl', ['$scope', '$routeParams', 'githubClient', 'sortedOccurrenceCounter',
              function ($scope, $routeParams, githubClient, SortedOccurrenceCounter) {
    $scope.log = [];
    var log = function (logName, msg) {
      $scope[logName] = msg;
    };
    var counter = new SortedOccurrenceCounter();

    // if we know what to search, let's find it:
    var projectName = $routeParams.q;
    // todo: convert this to workflow.
    if (projectName) {
      var projectsOccurances = {};
      var updateHistogram = function (foundProjects) {
        for (var i = 0; i < foundProjects.length; ++i) {
          var projectName = foundProjects[i].full_name;
          counter.add(projectName);
        }
        $scope.projects = counter.list(100);
      };
      var processStarredProjects = function (followers) {
        var processNextUser = function () {
          if (followers.length) {
            var userName = followers.pop().login;
            var usersProjectsCount = 0;
            log('favoriteLog', "Processing projects starred by " + userName);
            githubClient.getStarredProjects(userName).progress(function (progressReport){
              if (progressReport.total && progressReport.total > 30) {
                // This guy has starred more than 3k projects. Let's ignore him.
                // Tell github client to stop the process
                log('droppedUsers', 'Skipping ' + userName + '; Reason: Starred ~' + progressReport.total * progressReport.perPage + ' projects');
                return true;
              }
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
