define([
  './utils',
], function (utils) {

  /**
   * @name BaseReview
   * @class A <code>BaseReview</code> represents a code review (pull request)
   *
   * @property {String} title BaseReview title
   * @property {String} description BaseReview description
   * @property {ReviewUser} author BaseReview author
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
  function BaseReview(params) {
    this.author = params.author;
    // XXX: should be an array
    this.reviewer = params.reviewer;
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

  BaseReview.prototype.getId = function () {
    return this._id;
  };

  BaseReview.prototype.getAuthor = function () {
    return this.author;
  };

  BaseReview.prototype.getReviewer = function () {
    return this.reviewer;
  };

  BaseReview.prototype.getRepository = function () {
    return this.repository;
  };

  BaseReview.prototype.getTitle = function () {
    return this.title;
  };

  BaseReview.prototype.getDescription = function () {
    return this.description;
  };

  BaseReview.prototype.getCreationDate = function () {
    return this.creationDate;
  };

  BaseReview.prototype.getLastUpdateDate = function () {
    return this.lastUpdatedDate;
  };

  BaseReview.prototype.getBaseCommit = function () {
    return this.baseCommit;
  };

  BaseReview.prototype.getState = function () {
    return this.state;
  };

  BaseReview.prototype.isApproved = function () {
    return this.state === 'approved';
  };

  BaseReview.prototype.isRejected = function () {
    return this.state === 'rejected';
  };

  BaseReview.prototype.isPending = function () {
    return !this.isApproved() && !this.isRejected();
  }

  BaseReview.prototype.isReviewer = function (userId) {
    return this.reviewer.id === userId;
  };

  BaseReview.prototype.isInvolved = function (userId) {
    return this.author.id === userId || this.isReviewer(userId);
  };

  BaseReview.prototype.getComments = function (file, line) {
    if (file === undefined) return _.filter(this.comments);
    if (line === undefined) return _.filter(this.comments, {file:file});
    return _.filter(this.comments, {file:file, line:line});
  };

  function getUserInfo(user) {
    return utils.getUsers()[user.id] || {};
  }

  function processComments(comments) {
    _.forEach(comments, function (comment) {
      comment.sender = getUserInfo(comment.sender);
    });
  }

  function Review(params) {
    BaseReview.call(this, params)
    this.author = getUserInfo(this.author);
    // XXX: should be an array
    this.reviewer = getUserInfo(this.reviewer);
    processComments(this.comments);
  }
  Review.prototype = Object.create(BaseReview.prototype);

  /* Static methods */
  Review.BaseReview = BaseReview;
  Review.processComments = processComments;

  return Review;
})
