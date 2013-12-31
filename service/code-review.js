define([
  'bower_components/socket.io-client/dist/socket.io.min.js',
  'scripts/core/user',
  'scripts/core/event-bus',
  '../review.js',
], function (io, userService, eventBus, Review) {
  'use strict';

  var _projectsService;

  function getReviews(query) {
    var url = '/pull-requests' + (query ? '?' + $.param(query) : '');

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
      url: '/pull-requests',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(review),
      dataType: "json",
    });
  }

  function postReviewComment(review, comment) {
    return $.ajax({
      type: 'POST',
      url: '/pull-requests/' + review.getId() + '/comments',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(comment),
      dataType: "json",
    });
  }

  function postReviewState(review, newState) {
    return $.ajax({
      type: 'PUT',
      url: '/pull-requests/' + review.getId() + '/state',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ state: newState }),
      dataType: "json",
    });
  }

  function getUserInfo(user) {
    return {
      name: user.fullName,
      id: user.email,
    }
  }

  function getMySelf() {
    return getUserInfo(userService.getCache());
  }

  function createNewReviewRequest(repo, title, description, reviewer, commit) {
    var params = {
      author: getMySelf(),
      reviewer: reviewer,
      baseCommit: {
	sha1: commit.sha1,
      },
      repository: {
	id: repo.id,
	remote: repo.remote,
      },
      title: title,
      description: description,
    };

    return postReview(new Review(params));
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
    return $.getJSON('/users').then(function (reviewers) {
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

      eventBus.vent.trigger('code-review:comments-add', review, comments);
    });

    socket.on('review-state-change', function (reviewParams) {
      var review = new Review(reviewParams);

      eventBus.vent.trigger('code-review:state-change', review);
    });
  }

  var codeReviewService = {
    createNewReviewRequest: createNewReviewRequest,
    commentReview: commentReview,
    getPendingReviews: getPendingReviews,
    getReviewers: getReviewers,
    changeReviewState: postReviewState,
    getMySelf: getMySelf,
  };

  function runService(projectsService) {
    var socket = io.connect('/pull-requests');

    socket.on('connect', function () { ioConnect(socket); });

    _projectsService = projectsService;
  }

  return {
    run : [
      'projects-service',
      runService
    ],
    factorys: {
      'code-review-service': function () {
	return codeReviewService;
      },
    },
  };
});
