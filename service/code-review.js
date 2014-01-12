define([
  'bower_components/socket.io-client/dist/socket.io.min.js',
  'scripts/core/event-bus',
  '../review.js',
], function (io, eventBus, Review) {
  'use strict';

  var REST_API_URL = '/services/rest/v1';
  var PULL_REQUEST_URL = REST_API_URL + '/pull-requests';

  var _myselfUser;
  var _gitService;

  function getReviews(query) {
    var url = PULL_REQUEST_URL + (query ? '?' + $.param(query) : '');

    return $.ajax({
      type: 'GET',
      url: url,
      contentType: "application/json; charset=utf-8",
      dataType: "json",
    });
  }

  function postReview(review) {
    return $.ajax({
      type: 'POST',
      url: PULL_REQUEST_URL,
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(review),
      dataType: "json",
    });
  }

  function postReviewComment(review, comment) {
    return $.ajax({
      type: 'POST',
      url: PULL_REQUEST_URL + '/' + review.getId() + '/comments',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(comment),
      dataType: "json",
    });
  }

  function postReviewState(review, newState) {
    return $.ajax({
      type: 'PUT',
      url: PULL_REQUEST_URL + '/' + review.getId() + '/state',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ state: newState }),
      dataType: "json",
    });
  }

  function getUserInfo(user) {
    return {
      name: user.name.familyName + ' ' + user.name.givenName,
      id: user.username,
    }
  }

  function getMySelf() {
    return _myselfUser;
  }

  function getDashedDate() {
    var now = new Date();

    return [
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      /* XXX What the chance that user creates multiple review requests in
       * the same second?
       */
      now.getMilliseconds()
    ].join('-');
  }

  function createNewReviewRequest(repo, remote, title, description, reviewer, commit) {
    var branchName = ['code-review', getMySelf().id, getDashedDate()].join('.');
    var params = {
      author: {
	id: getMySelf().id,
      },
      reviewer: {
	id: reviewer.id,
      },
      baseCommit: {
	sha1: commit.sha1,
      },
      repository: {
	url: remote.url,
      },
      branch: branchName,
      title: title,
      description: description,
    };

    return _gitService.push(repo, remote.name, 'HEAD:' + branchName)
      .then(function () {
	return postReview(new Review.BaseReview(params));
      });
  }

  function fetchReviewRepository(review) {
    var localRepo = ['code-review', review.getId()].join('.');
    var remoteUrl = review.getRepository().url;

    /* XXX Assume the repo (if it exists) is our */
    return _gitService.getLocalRepositories().then(function (repos) {
      if (repos.indexOf(localRepo) !== -1) return;
      return _gitService.clone(remoteUrl, localRepo, true);
    }).then(function () {
      return localRepo;
    });
  }

  function commentReview(review, message, file, line) {
    var comment = {
      sender: getMySelf(),
      date: (new Date).toISOString(),
      message: message,
      file: file,
      line: line,
    };

    if (!comment.message) {
      return (new $.Deferred()).reject('empty message').promise();
    }

    return postReviewComment(review, comment);
  }

  function getPendingReviews() {
    function toReviews(objects) {
      return _.map(objects, function (o) {
	return new Review(o);
      });
    }
    /* Even when Ajax fails, return a resolved promise objects. */
    var pendingRequests =
      getReviews({ 'reviewer.id': getMySelf().id })
      .then(function (res) {
	return $.when(toReviews(res));
      }, function (err) {
	return $.when([]);
      });
    var pendingResponses =
      getReviews({ 'author.id': getMySelf().id })
      .then(function (res) {
	return $.when(toReviews(res));
      }, function (err) {
	return $.when([]);
      });

    return $.when(pendingRequests, pendingResponses)
      .then(function (rs1, rs2) {
	return rs1.concat(rs2);
      });
  }

  function getReviewers() {
    return $.getJSON(REST_API_URL + '/users').then(function (users) {
      var reviewers = _.filter(users, function (user) {
	if (user.username === getMySelf().id) return;
	if (user.username === 'adminUser@hp.com') return;
	return true;
      });
      return $.when(_.map(reviewers, getUserInfo));
    });
  }

  function ioConnect(socket) {
    socket.emit('auth', {id: getMySelf().id});

    socket.on('review-add', function (reviewParams) {
      var review = new Review(reviewParams);

      if (review.isInvolved(getMySelf().id)) {
	eventBus.vent.trigger('code-review:add', review);
	return;
      }

      eventBus.vent.trigger('code-review:rem', review);
    });

    socket.on('review-comments-add', function (reviewParams, comments) {
      var review = new Review(reviewParams);

      Review.processComments(comments);

      eventBus.vent.trigger('code-review:comments-add', review, comments);
    });

    socket.on('review-state-change', function (reviewParams) {
      var review = new Review(reviewParams);

      eventBus.vent.trigger('code-review:state-change', review);
    });
  }

  var codeReviewService = {
    createNewReviewRequest: createNewReviewRequest,
    fetchReviewRepository: fetchReviewRepository,
    commentReview: commentReview,
    getPendingReviews: getPendingReviews,
    getReviewers: getReviewers,
    changeReviewState: postReviewState,
  };

  function runService(userService, gitService) {
    var socket = io.connect('/pull-requests');

    socket.on('connect', function () { ioConnect(socket); });

    _gitService = gitService;
    _myselfUser = {
      id: userService.getUserName(),
    };
  }

  return {
    run : [
      'user-service',
      'git-service',
      runService
    ],
    factorys: {
      'code-review-service': function () {
	return codeReviewService;
      },
    },
  };
});
