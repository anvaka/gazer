'use strict';

describe('Service: sortedOccurrenceCounter', function () {

  // load the service's module
  beforeEach(module('githubStarsApp'));

  // instantiate service
  var sortedOccurrenceCounter;
  beforeEach(inject(function (_sortedOccurrenceCounter_) {
    sortedOccurrenceCounter = new _sortedOccurrenceCounter_();
  }));

  it('should be something', function () {
    expect(!!sortedOccurrenceCounter).toBe(true);
  });

  it('can add an object', function () {
    sortedOccurrenceCounter.add('foo', 'bar');
    var objects = sortedOccurrenceCounter.list();
    expect(!!objects).toBe(true);
    expect(objects.length).toBe(1);
    expect(objects[0].count).toBe(1);
    expect(objects[0].key).toBe('foo');
    expect(objects[0].value).toBe('bar');
  });

  it('can count occurrences', function () {
    for(var i = 0; i < 100; ++i) {
      sortedOccurrenceCounter.add('foo100', 'bar100');
    }
    for(var j = 0; j < 50; ++j) {
      sortedOccurrenceCounter.add('foo50', 'bar50');
    }
    var objects = sortedOccurrenceCounter.list();
    expect(objects[0].count).toBe(100);
    expect(objects[1].count).toBe(50);
    expect(objects[0].key).toBe('foo100');
    expect(objects[1].key).toBe('foo50');
    expect(objects[0].value).toBe('bar100');
    expect(objects[1].value).toBe('bar50');
  });
});
