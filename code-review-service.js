define([
  'scripts/core/user',
  'scripts/core/event-bus',
], function (userService, eventBus) {
  'use strict';

  var pendingReviewRequests = [],
      pendingResponseRequests = [],
      reviewers = [];

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

  function getMySelf() {
    var user = userService.getCache();

    return {
      fullName: user.fullName,
      email: user.email,
    }
  }

  function sendReviewRequest(title, description, reviewer, commit) {
    var review = {
      author: getMySelf(),
      reviewer: reviewer,
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

  function pollPendingReviewRequests() {
    var reviews = [];

    getReviews({ 'author.email': getMySelf().email, pending: 'author' })
      .fail(function (jqxhr, stat, err) { console.log(stat + ': ' + err); })
      .done(function (result) {
	console.log(result);
	reviews = result;
      })
      .always(function () {
	/* XXX Should work in our case */
	if (reviews.length === pendingReviewRequests.length &&
	  JSON.stringify(reviews) === JSON.stringify(pendingReviewRequests))
	{
	  return;
	}
	pendingReviewRequests = reviews;
	eventBus.vent.trigger('code-review:review-requests');
      });
  }

  function pollPendingResponseRequests() {
    var reviews = [];

    getReviews({ 'reviewer.email': getMySelf().email, pending: 'reviewer' })
      .fail(function (jqxhr, stat, err) { console.log(stat + ': ' + err); })
      .done(function (result) {
	console.log(result);
	reviews = result;
      })
      .always(function () {
	/* XXX Should work in our case */
	if (reviews.length === pendingResponseRequests.length &&
	  JSON.stringify(reviews) === JSON.stringify(pendingResponseRequests))
	{
	  return;
	}
	pendingResponseRequests = reviews;
	eventBus.vent.trigger('code-review:response-requests');
      });
  }

  function pollReviewers() {
    $.getJSON('/users').done(function (users) {
      reviewers = users;
    });
  }

  function run() {
    /* XXX */
    window.setInterval(function() {
      pollPendingReviewRequests();
      pollPendingResponseRequests();
      pollReviewers();
    }, 1997);
  }

  return {
    run: run,
    sendReviewRequest: sendReviewRequest,
    respondToReview: respondToReview,
    getPendingReviewRequests: function () { return pendingReviewRequests; },
    getPendingResponseRequests: function () { return pendingResponseRequests; },
    getReviewers: function () { return reviewers; },
  };
});
