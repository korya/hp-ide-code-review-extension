define([
  'bower_components/socket.io-client/dist/socket.io.min.js',
  'scripts/core/user',
  'scripts/core/event-bus',
], function (io, userService, eventBus) {
  'use strict';

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

  function postPendingStatus(review, newStatus) {
    return $.ajax({
      type: 'PUT',
      url: '/pull-requests/' + review._id + '/pending',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ pending: newStatus }),
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
      commit: commit,
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

    /* Reviewer says nothing -- approve. */
    if (!comment.message && review.pending === 'reviewer') {
      return postPendingStatus(review, 'approved');
    } else if (!comment.message) {
      return (new $.Deferred()).reject('empty message').promise();
    }

    return postReviewComment(review, comment).done(function () {
      var nextStatus = review.pending === 'reviewer' ? 'author' : 'reviewer';
      return postPendingStatus(review, nextStatus);
    });
  }

  function getPendingReviews() {
    /* Even when Ajax fails, return a resolved promise objects. */
    var pendingRequests =
      getReviews({ 'reviewer.email': getMySelf().email, pending: 'reviewer' })
      .then(function (res) {
	return $.when(res);
      }, function (err) {
	return $.when([]);
      });
    var pendingResponses =
      getReviews({ 'author.email': getMySelf().email, pending: 'author' })
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

  function ioConnect(socket) {
    socket.emit('auth', {email: getMySelf().email});
    socket.on('review-change', function (review) {
      if (review.pending === 'author' && review.author.email === getMySelf().email) {
	eventBus.vent.trigger('code-review:add', review);
	return;
      }
      if (review.pending === 'reviewer' && review.reviewer.email === getMySelf().email) {
	eventBus.vent.trigger('code-review:add', review);
	return;
      }
      eventBus.vent.trigger('code-review:rem', review);
    });
  }

  function run() {
    var socket = io.connect('/pull-requests');

    socket.on('connect', function () { ioConnect(socket); });
  }

  return {
    run: run,
    sendReviewRequest: sendReviewRequest,
    respondToReview: respondToReview,
    getPendingReviews: getPendingReviews,
    getReviewers: getReviewers,
  };
});
