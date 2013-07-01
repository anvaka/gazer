'use strict';

angular.module('githubStarsApp')
.factory('cacheService', ['indexedDB', function (dbProvider) {
  var db = dbProvider.create('githubAnalysisCache', {
    startedProjects : { key: 'name' },
    users: { key: 'name' },
    repositories: { key: 'full_name' }
  });

  return {
    getProjectFollowers: function (projectName) {
      return db.getByKey('startedProjects', projectName);
    },
    saveProjectFollowers: function (projectName, followers) {
      return db.save('startedProjects', {
        name: projectName,
        timestamp: +new Date(),
        followers: followers.map(function (follower) {
          return {
            login : follower.login,
            processed: 0
          };
        })
      });
    },
    getStarredProjects: function (userName) {
      return db.getByKey('users', userName)
        .then(function (userInfo) {
          return db.getAll('repositories', userInfo.starred || []);
        });
    },
    saveStarredProjects: function (user, repositories) {
      return db.saveAll('repositories', repositories).then(function() {
        db.save('users', {
          name : user,
          timestamp: +new Date(),
          starred: repositories.map(function (r) { return r.full_name; })
        });
      });
    },
    isSupported: dbProvider.isSupported()
  };
}]);

angular.module('githubStarsApp')
.factory('indexedDB', ['$q', '$timeout','$rootScope', function ($q, $timeout, $rootScope) {

  var isSupported = (function polyfillIDB(){
    try {
      if (!('indexedDB' in window.hasOwnProperty)) {
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      }
      return !!window.indexedDB;
    } catch (e) {
      return false;
    }
  })();
  var checkSupported = function (dbSettings) {
    var defer = $q.defer();
    if (!isSupported) {
      $timeout(function () {
        defer.reject('Index DB is not supported');
      });
    } else if (!dbSettings.db) {
      return dbSettings.open();
    } else {
      $timeout(function () {
        defer.resolve(dbSettings.db);
      });
    }
    return defer.promise;
  };

  function Database(dbName, schema) {
    this.name = dbName;
    this.schema = schema;
    this.db = null;
  }

  angular.extend(Database.prototype, {
    open : function () {
      var that = this;
      var deferred = $q.defer();
      if (!isSupported) {
        $timeout(function () {
          deferred.reject('IndexedDB is not supported');
        });
        return deferred.promise;
      }
      var request = window.indexedDB.open(that.name, 1);
      request.onerror = function(event) {
        deferred.reject(event);
        if (!$rootScope.$$phase) { $rootScope.$apply(); }
      };
      request.onsuccess = function() {
        that.db = request.result;
        deferred.resolve(that.db);
        $rootScope.$apply();
      };
      request.onupgradeneeded = function(event) {
        var db = event.target.result;
        for (var key in that.schema) {
          if (that.schema.hasOwnProperty(key)) {
            db.createObjectStore(key, { keyPath: that.schema[key].key });
          }
        }
      };
      return deferred.promise;
    },
    saveAll: function (tableName, values) {
      var deferred = $q.defer();
      checkSupported(this).then(
        function (db) {
          var transaction = db.transaction([tableName], 'readwrite');
          var objectStore = transaction.objectStore(tableName);
          var lastSaved = 0;

          transaction.oncomplete = function(event) {
            deferred.resolve(event);
            if (!$rootScope.$$phase) { $rootScope.$apply(); }
          };

          transaction.onerror = function(event) {
            deferred.reject(event);
            if (!$rootScope.$$phase) { $rootScope.$apply(); }
          };
          function saveNext() {
            if (lastSaved < values.length) {
              var request = objectStore.put(values[lastSaved]);
              request.onsuccess = saveNext;
              lastSaved += 1;
            }
          }

          saveNext();
        });

      return deferred.promise;
    },
    save : function (tableName, value) {
      var deferred = $q.defer();
      checkSupported(this).then(
        function (db) {
          var transaction = db.transaction([tableName], 'readwrite');
          transaction.oncomplete = function(event) {
            deferred.resolve(event);
            if (!$rootScope.$$phase) { $rootScope.$apply(); }
          };

          transaction.onerror = function(event) {
            deferred.reject(event);
            if (!$rootScope.$$phase) { $rootScope.$apply(); }
          };

          var objectStore = transaction.objectStore(tableName);
          objectStore.put(value);
        }
      );
      return deferred.promise;
    },
    getByKey: function (tableName, keyName) {
      var defer = $q.defer();
      checkSupported(this).then(
        function (db) {
          var transaction = db.transaction([tableName]);
          var objectStore = transaction.objectStore(tableName);
          var request = objectStore.get(keyName);
          request.onerror = function(event) {
            defer.reject(event);
            $rootScope.$apply();
          };
          request.onsuccess = function(event) {
            var result = event.target.result;
            if (result) {
              defer.resolve(result);
            } else {
              defer.reject('ObjectNotFound');
            }
            if (!$rootScope.$$phase) { $rootScope.$apply(); }
          };
        },
        function (err) { return defer.reject(err);});
      return defer.promise;
    },
    getAll: function (tableName, keys) {
      var defer = $q.defer();
      checkSupported(this).then(
        function (db) {
          // there should be something better than this...
          // We cannot use that.getByKey, because digesting root context
          // for every request is extremely inefficient.
          var results = [];
          var lastIndex = 0;
          var transaction = db.transaction([tableName]);
          var objectStore = transaction.objectStore(tableName);
          transaction.onerror = function(event) {
            defer.reject(event);
            if (!$rootScope.$$phase) { $rootScope.$apply(); }
          };

          function getNext(lastResult) {
            if (lastResult) {
              var record = lastResult.target.result;
              if (!record) {
                defer.reject('ObjectNotFound');
                if (!$rootScope.$$phase) {
                  $rootScope.$apply();
                  return;
                }
              } else {
                results.push(record);
              }
            }
            if (lastIndex < keys.length) {
              var request = objectStore.get(keys[lastIndex]);
              lastIndex += 1;
              request.onsuccess = getNext;
            } else {
              defer.resolve(results);
              if (!$rootScope.$$phase) { $rootScope.$apply(); }
            }
          }

          getNext();
        },
        function (err) { return defer.reject(err);});
      return defer.promise;
    }
  });

  return {
    isSupported: function () {
      return isSupported;
    },
    create : function (dbName, schema) {
      return new Database(dbName, schema);
    }
  };
}]);
