'use strict';

/**
* This service provides a SortedOccurrenceCounter class. The class counts
* number of cooccurrences of keys, and can return list of seen keys in
* descending order of their occurrences.
*
* Example:
*   var counter = new SortedOccurrenceCounter();
*   counter.add("foo"); counter.add("foo");
*   counter.add("bar");
*   console.dir(counter.list()); 
*   // prints [{ key: 'foo', count: 2 }, {key: 'bar', count: 1}]
*/
angular.module('githubStarsApp')
  .factory('sortedOccurrenceCounter', function () {
    var KeyAddress = function(layerIdx, inLayerIdx, value) {
      this.layerIdx = layerIdx;
      this.inLayerIdx = inLayerIdx;
      this.value = value;
    };

    var SortedOccurrenceCounter = function () {
      var objectLookup = {};
      var layeredArrays = [[]];
      this.__layers = layeredArrays;
      this.__objectLookup = objectLookup;
      /**
      * Adds key to the list of counted objects. 
      * You can optinally associate value with a key. Later it can be
      * retrieved by list() method.
      */
      this.add = function (key, value) {
        var keyAddress = objectLookup[key];
        if (!keyAddress) {
          keyAddress = new KeyAddress(0, -1, value);
          objectLookup[key] = keyAddress;
        }
        var layerIdx = keyAddress.layerIdx;
        var targetLayer = layeredArrays[layerIdx + 1] || [];

        // promote object to the next layer O(1):
        targetLayer.push(key);
        layeredArrays[layerIdx + 1] = targetLayer;
        keyAddress.layerIdx += 1;

        // remove object from the old layer O(1):
        if (keyAddress.inLayerIdx >= 0) {
          var prevLayer = layeredArrays[layerIdx];
          if (prevLayer.length -1 !== keyAddress.inLayerIdx) {
            // Swap object with the last object in the layer array, update the
            // address:
            var lastObjectKey = prevLayer[prevLayer.length - 1];
            prevLayer[keyAddress.inLayerIdx] = lastObjectKey;
            objectLookup[lastObjectKey].inLayerIdx = keyAddress.inLayerIdx;
          }
          prevLayer.length -= 1; // remove the last element.
        }
        keyAddress.inLayerIdx = targetLayer.length - 1;
      };

      /*
      * Lists added objects in the decreasing number of their occurrences.
      * Performance: O(count)
      *
      * @param {Number} count - optional arugment to specify number of requred
      * items to list. If argument is not passed lists all added objects.
      *
      * @return {Array} of objects: {count: Number, key: key, value: value}
      */
      this.list = function (count) {
        var orderedList = [];
        for (var i = layeredArrays.length - 1; i >= 0; --i) {
          var layer = layeredArrays[i];
          for(var j = 0; j < layer.length; ++j) {
            orderedList.push({
              count: i, // each layer denotes number of occurrences
              key: layer[j],
              value: objectLookup[layer[j]].value
            });
            if (orderedList.length === count) {
              return orderedList; // Enough is enough. Return it.
            }
          }
        }
        return orderedList;
      };
    };

    return SortedOccurrenceCounter;
  });
