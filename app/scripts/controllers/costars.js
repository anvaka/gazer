'use strict';

angular.module('githubStarsApp')
  .controller('CostarsCtrl', ['$scope', '$routeParams', 'githubClient', 'sortedOccurrenceCounter',
              function ($scope, $routeParams, githubClient, SortedOccurrenceCounter) {
    $scope.log = [];
    var log = function (logName, msg) {
      $scope[logName] = msg;
    };
    var counter = new SortedOccurrenceCounter();
    function UserFavoritesLogEntry(fields) {
      angular.extend(this, fields);
    }
    var getRepoName = function (userInput) {
      var repoMatch = userInput.match(/github.com\/([^/]+\/[^\/]+)/i) || // github.com/user/repo/...
                      userInput.match(/([^/]+\/[^\/]+)/i);               // or just user/repo
      if (repoMatch) {
        return repoMatch[1];
      }
    };
    // if we know what to search, let's find it:
    var analyzedProjectName = getRepoName($routeParams.q);
    var invariantProjectName = analyzedProjectName.toLowerCase();
    if (!analyzedProjectName) {
      return;
    }

    // todo: convert this to workflow.
    var updateHistogram = function (foundProjects) {
      for (var i = 0; i < foundProjects.length; ++i) {
        var projectName = foundProjects[i].full_name;
        if (invariantProjectName !== projectName.toLowerCase()) {
          var projectData = foundProjects[i];
          counter.add(projectName, {
            watchers_count : projectData.watchers_count,
            forks_count: projectData.forks_count,
            description: projectData.description
          });
        }
      }
      $scope.projects = counter.list(100);
    };
    var processStarredProjects = function (followers) {
      var totalUsers = followers.length;
      var processNextUser = function () {
        if (!followers.length) {
          log('favoriteLog', null);
          log('done', 'Analysis complete.');
          return;
        }

        var userName = followers.pop().login;
        var usersProjectsCount = 0;
        log('favoriteLog', new UserFavoritesLogEntry({
            userName: userName,
            processedCount: usersProjectsCount,
            step: totalUsers - followers.length,
            totalSteps: totalUsers
          }));

        githubClient.getStarredProjects(userName).progress(function (progressReport){
          if (progressReport.total && progressReport.total > 30) {
            // This guy has starred more than 3k projects. Let's ignore him.
            // Tell github client to stop the process
            log('droppedUsers', 'Skipping ' + userName + ': Starred ~' + progressReport.total * progressReport.perPage + ' projects');
            return true;
          }
          usersProjectsCount += progressReport.data.length;
          updateHistogram(progressReport.data);
          log('favoriteLog', new UserFavoritesLogEntry({
              userName: userName,
              processedCount: usersProjectsCount,
              step: totalUsers - followers.length,
              totalSteps: totalUsers
            }));
        }).then(function () {
          processNextUser();
        }, function () {
          // debugger;
        });
      };
      processNextUser();
    };
    var foundFollowers = [];
    githubClient.getStargazers(analyzedProjectName)
      .progress(function (progressReport) {
        foundFollowers = foundFollowers.concat(progressReport.data);
        log('followersLog', 'Gathering ' + analyzedProjectName + ' followers: ' + foundFollowers.length);
      })
      .then(function() {
        log('followersLog', 'Found ' + foundFollowers.length + ' followers of ' + analyzedProjectName);
        processStarredProjects(foundFollowers);
      });
  }]);
