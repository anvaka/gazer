'use strict';

angular.module('githubStarsApp')
  .controller('CostarsCtrl', ['$scope', '$routeParams', 'promisingStream', 'githubClient', 'sortedOccurrenceCounter',
              function ($scope, $routeParams, promisingStream, githubClient, SortedOccurrenceCounter) {
    $scope.log = [];
    var log = function (logName, msg) {
      $scope[logName] = msg;
    };
    var counter = new SortedOccurrenceCounter();
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
    $scope.userStatus = {};
    var updateUserAnalysisProgress = function (userName, processedCount, totalRecords) {
      var record = $scope.userStatus[userName] || { name: userName};
      record.processedCount = totalRecords ? (processedCount + '/' + totalRecords) : processedCount;
      $scope.userStatus[userName] = record;
    };
    var removeUserAnalysisLogRecord = function (userName) {
      delete $scope.userStatus[userName];
    };
    var updateOverallProgress = function (totalRecords, recordsAnalyzed) {
      log('followersLog', 'Analyzed ' + recordsAnalyzed + ' out of ' + totalRecords + ' followers' );
    };
    var processStarredProjects = function (followers) {
      var createProgressUpdateHandler = function (userName) {
        var processedCount = 0;
        return function (progressReport) {
          if (progressReport.totalPages && progressReport.totalPages > 12) {
            // This guy has starred more than 1200 projects. Let's ignore him.
            // Tell github client to stop the process:
            return true; // TODO: this is cryptic. Consider rejecting the promise?
          }
          processedCount += progressReport.data.length;
          updateUserAnalysisProgress(userName,
                                     processedCount,
                                     progressReport.totalPages * progressReport.perPage);
          updateHistogram(progressReport.data);
        };
      };
      // we don't really need the entire hash of repo details to construct
      // usage table:
      var requiredRepoProperties = {
        full_name: true,
        watchers_count: true,
        forks_count: true,
        description: true
      };
      var totalRecords = followers.length;
      var usersAnalyzed = 0;
      promisingStream.process(followers, function (follower) {
        var onGetStarredProjectProgressChanged = createProgressUpdateHandler(follower.login);

        return githubClient.getStarredProjects(follower.login, requiredRepoProperties)
                           .progress(onGetStarredProjectProgressChanged)
                           .then(function(data){
                              // so, we have data on this user. Purge him from the log:
                              removeUserAnalysisLogRecord(follower.login);
                              updateOverallProgress(totalRecords, ++usersAnalyzed);
                              return data.length;
                            }, function(reason){
                              // todo: notify on UI?
                              removeUserAnalysisLogRecord(follower.login);
                              updateOverallProgress(totalRecords, ++usersAnalyzed);
                              console.log(reason);
                            });
      }, 10).then(function(result){
        console.dir(result);
        log('done', 'Done!');
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
