'use strict';

angular.module('githubStarsApp')
  .controller('CostarsCtrl', ['$scope', '$routeParams', '$cookies', 'promisingStream', 'precalculator', 'githubClient', 'sortedOccurrenceCounter',
              function ($scope, $routeParams, $cookies, promisingStream, precalculator, githubClient, SortedOccurrenceCounter) {
    // TODO: this controller needs to be refactored - it violates SRP and contains more logic
    // than it should... I'm sorry about this mess, I will refactor this.

    // Analysis configuration:
    function parseStarsCapLimit(value) {
      var parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
      return 500; //default
    }
    function parseStarsCapEnabled(value) {
      return value === 'false' ? false : true;
    }

    var settings = {
      // # of users to process in parallel. "Process" means getting all their
      // starred projects from GitHub client:
      parallelUsersProcessing: 10,

      // How many records of final analysis do we want to show?
      showResultRecords: 100,

      // analyze only random N stargazers. Makes it faster for popular projects
      // (thanks to Addy Osmani for the hint)
      starsCap: parseStarsCapLimit($cookies.starsCap),

      // Do we need to take into account stars cap?
      starsCapEnabled: parseStarsCapEnabled($cookies.starsCapEnabled),

      // Maximum number of starred repositores pages to download per user
      // Based on analysis of 20K users, 80% of them had less than 6 pages of likes
      maxStarredPagesPerUser: 6,

      // Some browsers may not support our caching store
      cacheSupported: githubClient.cacheSupported(),

      // User can disable the cache:
      cacheEnabled: githubClient.cacheEnabled()
    };

    $scope.settings = settings;

    $scope.toggleCacheEnabled = function () {
      githubClient.setCaching($scope.settings.cacheEnabled);
    };

    $scope.toggleStarsCapEnabled = function () {
      $cookies.starsCapEnabled = settings.starsCapEnabled.toString();
    };

    $scope.$watch('settings.starsCap', function (newValue) {
      $cookies.starsCap = parseStarsCapLimit(newValue).toString();
    }, true);

    // utility methods:
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

    var shuffleArray = function (array) {
      var i, j, t;
      for (i = array.length - 1; i > 0; --i) {
        j = (Math.random() * (i + 1)) | 0; // i inclusive
        t = array[j];
        array[j] = array[i];
        array[i] = t;
      }

      return array;
    };

    // If we know what to search, let's find it:
    var invariantProjectName = getRepoName($routeParams.q);
    if (!invariantProjectName) {
      $scope.searchingLabel = 'Type in repository name to start analysis ↑';
      return;
    }
    $scope.searchingLabel = 'Searching for "' + invariantProjectName + '"';
    // this is getting super bad. I'm so excited to release this quicker, 
    // but my techincal debt is enourmous here. Please excuse me!
    function showPrecalculatedResults(similarProjects) {
      $scope.searchingLabel = '';
      $scope.repoTitle = invariantProjectName;
      $scope.displayOfflineResults = true;
      $scope.projects = similarProjects;
    }

    function makeOnlineCalculation(invariantProjectName) {
      // Projects similarity calculation settings/tracking
      var ourStargazersCount = 0; // number of stargazers who follow our project
      var analyzedRatio = 1;      // % of our stargazers being analyzed
      var counter = new SortedOccurrenceCounter(); // Our data model.
      window.counter = counter;   // Developers are curious. Expose this for their exploration

      // How we find a similarity between two projects?
      var similarityCalculator = function (their, our, shared) {
        // apprently this formula represents a generalization of Jaccard index 
        // (http://en.wikipedia.org/wiki/Jaccard_index)
        // Thanks to Cameron Davidson-Pilon for pointing out
        return Math.round(100 * 2 * shared/(analyzedRatio * (their + our)));
      };

      // Sorting:
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

      var updateSort = function () {
        if ($scope.sortBy === 'sharedPercentOfStars') {
          var projects = [];
          // TODO: percent sort is too slow and is not optimized yet.
          var sorted = counter.customSort(ourStargazersCount, similarityCalculator);
          for (var i = 0; i < settings.showResultRecords; ++i) {
            projects.push(sorted[i]);
          }
          $scope.projects = projects;
        } else {
          // this is very fast. O(settings.showResultRecords).
          $scope.projects = counter.list(settings.showResultRecords);
        }
      };

      //Logging:
      $scope.logEntries = {};
      var log = function (logName, msg) {
        $scope.logEntries[logName] = msg;
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

      var processStarredProjects = function (followers) {
        var totalRecords = followers.length;
        var usersAnalyzed = 0;
        var createProgressUpdateHandler = function (userName) {
          var processedCount = 0;
          return function (progressReport) {
            if (progressReport.totalPages && progressReport.totalPages > settings.maxStarredPagesPerUser) {
              // This guy has starred too many projects. Let's ignore him.
              // Tell github client to stop download remaining pages:
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

        // Promising stream takes a burden of keeping at most N non resolved promises
        // in parallel. As soon as a promise is resolved, the stream uses factroy method
        // to create and run a new promise. It keeps going until all items in the array
        // are converted to promises and resolved.
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
        }, settings.parallelUsersProcessing);

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
        $scope.displayOnlineCalculation = true;
        $scope.searchingLabel = '';
        foundFollowersCount += progressReport.data.length;
        log('followersLog', 'Gathering ' + invariantProjectName + ' followers: ' + foundFollowersCount);
      }).then(function(foundFollowers) {
        $scope.displayOnlineCalculation = true;
        $scope.searchingLabel = '';
        $scope.repoTitle = invariantProjectName;
        log('followersLog', 'Found ' + foundFollowers.length + ' followers of ' + invariantProjectName);
        if (!scopeDestroyed) {
          if (settings.starsCapEnabled && foundFollowers.length > settings.starsCap) {
            analyzedRatio = settings.starsCap/foundFollowers.length;
            // The array needs to be random, to avoid "mass stargazing"
            // effect when project is featured on a news site:
            foundFollowers = shuffleArray(foundFollowers);
            foundFollowers.length = settings.starsCap;
          }
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
    }

    precalculator.getPrecalculatedRecommendation(invariantProjectName)
      .then(function(projects){
        showPrecalculatedResults(projects);
      }, function () {
        makeOnlineCalculation(invariantProjectName);
      });
  }]);
