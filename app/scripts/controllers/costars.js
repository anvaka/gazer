'use strict';

angular.module('githubStarsApp')
  .controller('CostarsCtrl', ['$scope', '$routeParams', 'promisingStream', 'githubClient', 'sortedOccurrenceCounter',
              function ($scope, $routeParams, promisingStream, githubClient, SortedOccurrenceCounter) {
    $scope.logEntries = {};
    var log = function (logName, msg) {
      $scope.logEntries[logName] = msg;
    };
    var counter = new SortedOccurrenceCounter();
    window.counter = counter; // this is for debugging/exploratory purposes
    var getRepoName = function (userInput) {
      // we are very forgiving here: allow whitespace, github.com
      // take only user/repo part of the pattern
      userInput = userInput || '';
      userInput = userInput.replace(/\s/g, '');
      var repoMatch = userInput.match(/github.com\/([^/]+\/[^\/]+)/i) || // github.com/user/repo/...
                      userInput.match(/([^/]+\/[^\/]+)/i);               // or just user/repo
      if (repoMatch) {
        return repoMatch[1].toLowerCase();
      }
    };
    $scope.searchingLabel = 'Type in repository name to start analysis ↑';

    $scope.cacheSupported = githubClient.cacheSupported();
    $scope.cachingOptions = {
      enabled: githubClient.cacheEnabled()
    };
    $scope.toggleCacheEnabled = function () {
      githubClient.setCaching($scope.cachingOptions.enabled);
    };
    // if we know what to search, let's find it:
    var invariantProjectName = getRepoName($routeParams.q);
    if (!invariantProjectName) {
      return;
    }
    $scope.searchingLabel = 'Searching for "' + invariantProjectName + '"';

    // TODO: this controller needs to be refactored - it contains more logic than it should...
    var sortTypes = {
      '#' : 'sharedNumberOfStars',
      '%' : 'sharedPercentOfStars'
    };
    $scope.sortBy = sortTypes['#'];
    $scope.classForSort = function (sortType) {
      if ((sortType === '#' && $scope.sortBy === 'sharedNumberOfStars') ||
          (sortType === '%' && $scope.sortBy === 'sharedPercentOfStars')){
        return 'current';
      }
      return '';
    };
    $scope.changeSort = function (sortType) {
      $scope.sortBy = sortTypes[sortType];
      updateSort();
    };
    var ourStargazersCount = 0;
    var updateSort = function () {
      if ($scope.sortBy === 'sharedPercentOfStars') {
        var projects = [];
        // TODO: percent sort is too slow and is not optimized yet.
        var sorted = counter.customSort(ourStargazersCount, function (their, our, shared) {
          return Math.round(100 * 2 * shared/(their + our));
        });
        for (var i = 0; i < 100; ++i) {
          projects.push(sorted[i]);
        }
        $scope.projects = projects;
      } else {
        // this is very fast. O(100).
        $scope.projects = counter.list(100);
      }
    };
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
      updateSort();
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
      ourStargazersCount = recordsAnalyzed;
    };
    var processStarredProjects = function (followers) {
      var totalRecords = followers.length;
      var usersAnalyzed = 0;
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

      var discoveryProcess = promisingStream.process(followers, function (follower) {
        var onGetStarredProjectProgressChanged = createProgressUpdateHandler(follower.login);

        return githubClient.getStarredProjects(follower.login, requiredRepoProperties)
                           .progress(onGetStarredProjectProgressChanged)
                           .then(function(data){
                              // so, we have data on this user. Remove him from the log:
                              removeUserAnalysisLogRecord(follower.login);
                              updateOverallProgress(totalRecords, ++usersAnalyzed);
                              return data.length;
                            }, function(reason){
                              // todo: notify on UI?
                              removeUserAnalysisLogRecord(follower.login);
                              updateOverallProgress(totalRecords, ++usersAnalyzed);
                              console.log(reason);
                            });
      }, 10);
      discoveryProcess.promise.then(function(result){
        console.dir(result);
        log('done', 'Done!');
      });
      return discoveryProcess;
    };

    var discoveryProcess, scopeDestroyed;
    var foundFollowersCount = 0;
    githubClient.getStargazers(invariantProjectName, {
      login : true // we need only their login name here...
    }).progress(function (progressReport) {
      $scope.searchingLabel = '';
      foundFollowersCount += progressReport.data.length;
      log('followersLog', 'Gathering ' + invariantProjectName + ' followers: ' + foundFollowersCount);
    }).then(function(foundFollowers) {
      $scope.searchingLabel = '';
      $scope.repoTitle = invariantProjectName;
      log('followersLog', 'Found ' + foundFollowers.length + ' followers of ' + invariantProjectName);
      if (!scopeDestroyed) {
        discoveryProcess = processStarredProjects(foundFollowers);
      }
    }, function () {
      $scope.searchingLabel = 'Sorry, I couldn\'t find this reposiotry on GitHub.com. Make sure it exists.';
    });

    $scope.$on('$destroy', function () {
      if (discoveryProcess) {
        discoveryProcess.cancel();
        scopeDestroyed = true;
      }
    });
  }]);
