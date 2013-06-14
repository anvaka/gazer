'use strict';

angular.module('githubStarsApp')
  .controller('CostarsCtrl', ['$scope', '$routeParams', 'promisingStream', 'githubClient', 'sortedOccurrenceCounter',
              function ($scope, $routeParams, promisingStream, githubClient, SortedOccurrenceCounter) {
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
      var bindUserProgressUpdate = function (userName) {
        return function (progressReport) {
          if (progressReport.totalPages && progressReport.totalPages > 12) {
            // This guy has starred more than 3k projects. Let's ignore him.
            // Tell github client to stop the process
            log('droppedUsers', 'Skipping ' + userName + ': Starred ~' + progressReport.totalPages * progressReport.perPage + ' projects');
            return true;
          }
          // usersProjectsCount += progressReport.data.length;
          updateHistogram(progressReport.data);
          log('favoriteLog', new UserFavoritesLogEntry({
              userName: userName,
              processedCount: 0,
              step: 0,
              totalSteps: 0
            }));
        };
      };
      var shrinkObj = {
        full_name: true,
        watchers_count: true,
        forks_count: true,
        description: true
      };
      promisingStream.process(followers, function (follower) {
        return githubClient.getStarredProjects(follower.login, shrinkObj)
                           .progress(bindUserProgressUpdate(follower.login))
                           .then(function(data){
                              return data.length;
                            }, function(reason){
                              console.log(reason);
                            });
      }, 10).then(function(result){
        console.dir(result);
        // done!
      });
    };
    var foundFollowersCount = 0;
    githubClient.getStargazers(analyzedProjectName, {
      login : true // we need only their login here...
    }).progress(function (progressReport) {
      foundFollowersCount += progressReport.data.length;
      log('followersLog', 'Gathering ' + analyzedProjectName + ' followers: ' + foundFollowersCount);
    }).then(function(foundFollowers) {
      log('followersLog', 'Found ' + foundFollowers.length + ' followers of ' + analyzedProjectName);
      processStarredProjects(foundFollowers);
    });
  }]);
