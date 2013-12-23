define([
  'bower_components/socket.io-client/dist/socket.io.min.js',
  'scripts/core/user',
  'scripts/core/event-bus',
], function (io, userService, eventBus) {
  'use strict';

  var _gitService,
      _projectsService;

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
      url: '/pull-requests/' + review._id + '/comments',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(comment),
      dataType: "json",
    });
  }

  function postReviewState(review, newState) {
    return $.ajax({
      type: 'PUT',
      url: '/pull-requests/' + review._id + '/state',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ state: newState }),
      dataType: "json",
    });
  }

  function getUserInfo(user) {
    return {
      fullName: user.fullName,
      email: user.email,
    }
  }

  function getMySelf() {
    return getUserInfo(userService.getCache());
  }

  function sendReviewRequest(title, description, reviewer, commit) {
    var review = {
      author: getMySelf(),
      reviewer: getUserInfo(reviewer),
      title: title,
      description: description,
      repo: _projectsService.getActiveProject().id,
      commit: {
	sha1: commit.sha1,
      },
      date: (new Date).toUTCString(),
    }

    return postReview(review);
  }

  function respondToReview(review, message) {
    var comment = {
      author: getMySelf(),
      date: (new Date).toUTCString(),
      message: message,
    };

    if (!comment.message) {
      return (new $.Deferred()).reject('empty message').promise();
    }

    return postReviewComment(review, comment);
  }

  function getPendingReviews() {
    /* Even when Ajax fails, return a resolved promise objects. */
    var pendingRequests =
      getReviews({ 'reviewer.email': getMySelf().email })
      .then(function (res) {
	return $.when(res);
      }, function (err) {
	return $.when([]);
      });
    var pendingResponses =
      getReviews({ 'author.email': getMySelf().email })
      .then(function (res) {
	return $.when(res);
      }, function (err) {
	return $.when([]);
      });

    return $.when(pendingRequests, pendingResponses)
      .then(function (rs1, rs2) {
	return rs1.concat(rs2);
      });
  }

  function getReviewers() {
    return $.getJSON('/users').then(function (res) {
      return $.when(res);
    });
  }

  function getCommitList() {
    var project = _projectsService.getActiveProject();

    if (!project) {
      return (new $.Deferred()).reject('no active project').promise();
    }

    return _gitService.log(project.id).then(function (res) {
      return $.when(res);
    });
  }

  function getCommitDetails(repo, sha1) {
    return _gitService.commitShow(repo, sha1).then(function (res) {
      return $.when(res);
    }, function (xhr) {
      var error;
      if (xhr.responseJSON && xhr.responseJSON.error) {
	error = xhr.responseJSON.error;
      } else {
	error = xhr.responseText;
      }
      console.error('error:', xhr, '; e:', error);
      return $.Deferred().reject(error).promise();
    });
  }

  function getFileRevision(repo, file, revision) {
    return _gitService.showFile(repo, file, revision).then(function (res) {
      return $.when(res);
    }, function (xhr) {
      var error = '';
      if (xhr.responseJSON.error) {
	error += xhr.responseJSON.error.error;
	error += '\n\n';
	error += xhr.responseJSON.error.command;
	error += '\n\n';
	error += xhr.responseJSON.error.stackAtCall;
      } else {
	error += xhr.responseText;
      }
      console.error('error:', xhr, '; e:', error);
      return $.Deferred().reject(error).promise();
    });
  }

  function ioConnect(socket) {
    socket.emit('auth', {email: getMySelf().email});

    socket.on('review-add', function (review) {
      var myEmail = getMySelf().email;
      if (review.author.email === myEmail || review.reviewer.email === myEmail) {
	eventBus.vent.trigger('code-review:add', review);
	return;
      }
      eventBus.vent.trigger('code-review:rem', review);
    });

    socket.on('review-comments-add', function (review, comments) {
      eventBus.vent.trigger('code-review:comments-add', review, comments);
    });

    socket.on('review-state-change', function (review) {
      console.log('state-change:', review.state);
      eventBus.vent.trigger('code-review:state-change', review);
    });
  }

  function run(gitService, projectsService) {
    var socket = io.connect('/pull-requests');

    socket.on('connect', function () { ioConnect(socket); });

    _gitService = gitService;
    _projectsService = projectsService;
  }

  return {
    run: run,
    sendReviewRequest: sendReviewRequest,
    respondToReview: respondToReview,
    getPendingReviews: getPendingReviews,
    getReviewers: getReviewers,
    getCommitList: getCommitList,
    getCommitDetails: getCommitDetails,
    getFileRevision: getFileRevision,
    changeReviewState: postReviewState,
    getMySelf: getMySelf,
  };
});
