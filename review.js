define([
], function () {

  /**
   * @name Review
   * @class A <code>Review</code> represents a code review (pull request)
   *
   * @property {String} title Review title
   * @property {String} description Review description
   * @property {ReviewUser} author Review author
   * @property {[ReviewUser]} reviewers The reviewer list for the review  //XXX
   * @property {String} creationDate Date of creation in ISO 8601 format
   * @property {String} lastUpdatedDate Date of last update in ISO 8601 format
   * @property {Object} repository The repository where the code can be found
   *   @property {String} remote Repository remote URL
   *   @property {String} id ID of local repository (a cloned one)
   *     When repository is not cloned, its remote URL should be specified.
   *     After the repository is cloned, the ID of its local cloned copy should
   *     be specified.
   * @property {String} branch The branch where the code change was done
   * @property {String} baseCommit 
   * @property {[ReviewComment]} comments The comments of the review
   * @property {String} state One of 'pendng', 'approved' or 'rejected'
   */
  /**
   * @name ReviewUser
   * @class A <code>ReviewUser</code> stores the minimal user information,
   *    such that the user can be identified.
   *
   * @property {String} id User unique ID
   * @property {String} name User name to be displayed
   */
  /**
   * @name ReviewComment
   * @class A <code>ReviewComment</code> stores comment data
   *
   * @property {String} id  //XXX
   * @property {String} message
   * @property {ReviewUser} sender
   * @property {String} date
   * @property {String} file
   * @property {Integer} line
   * @property {String} parentId //XXX
   * @property {String} state One of 'approved' or 'rejected' //XXX
   */

  function getUserInfo(user) {
    return {
      id: user.id,
      name: user.name || user.id,
    };
  }

  function Review(params) {
    this.author = getUserInfo(params.author);
    // XXX: should be an array
    this.reviewer = getUserInfo(params.reviewer);
    this.repository = {
      id: params.repository.id,
      remote: params.repository.remote,
    };
    this.branch = params.branch;
    this.baseCommit = {
      sha1: params.baseCommit.sha1,
    };
    this.title = params.title;
    this.description = params.description;
    this.creationDate = params.creationDate || (new Date).toISOString();
    this.lastUpdatedDate = params.lastUpdatedDate || this.creationDate;
    // XXX Not a tree
    this.comments = params.comments || [];
    this.state = params.state || 'pending';
    // XXX Internal field set by mongoDB
    this._id = params._id;
  }

  Review.prototype.getId = function () {
    return this._id;
  };

  Review.prototype.getAuthor = function () {
    return this.author;
  };

  Review.prototype.getReviewer = function () {
    return this.reviewer;
  };

  Review.prototype.getRepository = function () {
    return this.repository;
  };

  Review.prototype.getTitle = function () {
    return this.title;
  };

  Review.prototype.getDescription = function () {
    return this.description;
  };

  Review.prototype.getCreationDate = function () {
    return this.creationDate;
  };

  Review.prototype.getBaseCommit = function () {
    return this.baseCommit;
  };

  Review.prototype.getState = function () {
    return this.state;
  };

  Review.prototype.isApproved = function () {
    return this.state === 'approved';
  };

  Review.prototype.isRejected = function () {
    return this.state === 'rejected';
  };

  Review.prototype.isPending = function () {
    return !this.isApproved() && !this.isRejected();
  }

  Review.prototype.isReviewer = function (userId) {
    return this.reviewer.id === userId;
  };

  Review.prototype.isInvolved = function (userId) {
    return this.author.id === userId || this.isReviewer(userId);
  };

  Review.prototype.getComments = function (file, line) {
    if (file === undefined) return _.filter(this.comments);
    if (line === undefined) return _.filter(this.comments, {file:file});
    return _.filter(this.comments, {file:file, line:line});
  };

  return Review;
})
