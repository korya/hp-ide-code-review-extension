define([
], function () {

  function Location(file, line) {
    this.file = file;
    this.line = line;
  }
  Location.prototype = {
    toString: function () {
      if (!this.file) return '';
      if (!this.line) return this.file;
      return this.file + ':' + this.line;
    },
  };

  function AnyLocationFilter() {
    this.file = undefined;
    this.line = undefined;
  }
  AnyLocationFilter.prototype = {
    filter: function (location) {
      return true;
    },
    toString: function () {
      return 'all';
    },
    toLocation: function () {
      return new Location(this.file, this.line);
    },
    isSpecific: function () {
      return false;
    },
  }

  function ReviewWideLocationFilter() {
    AnyLocationFilter.call(this);
  }
  ReviewWideLocationFilter.prototype = Object.create(AnyLocationFilter.prototype);
  ReviewWideLocationFilter.prototype.filter = function (location) {
    return !location.file;
  }
  ReviewWideLocationFilter.prototype.toString = function (location) {
    return 'review wide only';
  }
  ReviewWideLocationFilter.prototype.isSpecific = function () {
    return true;
  }

  function FileAllLocationFilter(file) {
    AnyLocationFilter.call(this);
    this.file = file;
  }
  FileAllLocationFilter.prototype = Object.create(AnyLocationFilter.prototype);
  FileAllLocationFilter.prototype.filter = function (location) {
    return location.file === this.file;
  }
  FileAllLocationFilter.prototype.toString = function (location) {
    return this.file + ': all';
  }

  function FileWideLocationFilter(file) {
    FileAllLocationFilter.call(this, file);
  }
  FileWideLocationFilter.prototype = Object.create(FileAllLocationFilter.prototype);
  FileWideLocationFilter.prototype.filter = function (location) {
    return FileAllLocationFilter.prototype.filter.call(this, location) &&
      !location.line;
  }
  FileWideLocationFilter.prototype.toString = function (location) {
    return this.file + ': file wide only';
  }
  FileWideLocationFilter.prototype.isSpecific = function () {
    return true;
  }

  function FileLineLocationFilter(file, line) {
    FileAllLocationFilter.call(this, file);
    this.line = line;
  }
  FileLineLocationFilter.prototype = Object.create(FileAllLocationFilter.prototype);
  FileLineLocationFilter.prototype.filter = function (location) {
    return FileAllLocationFilter.prototype.filter.call(this, location) &&
      location.line === this.line;
  }
  FileLineLocationFilter.prototype.toString = function () {
    return this.file + ':' + this.line;
  }
  FileLineLocationFilter.prototype.isSpecific = function () {
    return true;
  }

  /* Adding as static member */
  Location.filters = {
    All: AnyLocationFilter,
    ReviewWide: ReviewWideLocationFilter,
    FileAll: FileAllLocationFilter,
    FileWide: FileWideLocationFilter,
    FileLine: FileLineLocationFilter,
  };

  return Location;
});
