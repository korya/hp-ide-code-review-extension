define([
  'scripts/core/event-bus',
], function (eventBus) {
  'use strict';

  var REVIEW_IMG = 'extensions/hpsw/code-review/1.00/notifications/images/comment-talk-multiple-50.png';
  var BASE_NOTIFICATION_ID = 'code-review';

  function buildNotificationID(parts) {
    return [BASE_NOTIFICATION_ID].concat(parts).join('.');
  }

  function addPendingReviewNotification(notificationService, megaMenuService,
    codeReviewPage, review)
  {
    notificationService.add({
      id: buildNotificationID(['add', review.getId()]),
      image: REVIEW_IMG,
      message: 'New code review request "' + review.getTitle() + '"',
      onClick: function () {
	console.log('review notification was clicked', {review:review});
	megaMenuService.selectPage('codeReviewPage');
	codeReviewPage.openReview(review);
      },
    });
  }

  function runModule(notificationService, megaMenuService, codeReviewPage) {
    eventBus.vent.on('code-review:add', function (review) {
      addPendingReviewNotification(notificationService, megaMenuService,
	codeReviewPage, review);
    });

    eventBus.vent.on('code-review:rem', function (review) {
      notificationService.add({
	id: buildNotificationID(['rem', review.getId()]),
	image: REVIEW_IMG,
	message: 'Code review request was removed "' + review.getTitle() + '"',
      });
    });

    eventBus.vent.on('code-review:comments-add', function (review, comments) {
      comments.forEach(function (comment) {
	notificationService.add({
	  id: buildNotificationID(['comments-add', review.getId()]),
	  image: REVIEW_IMG,
	  message: 'New comments for review "' + review.getTitle() + '"',
	  onClick: function () {
	    console.log('review notification was clicked', {review:review});
	    megaMenuService.selectPage('codeReviewPage');
	    codeReviewPage.openReview(review).then(function () {
	      if (comment.file) {
		codeReviewPage.openFile(comment.file);
	      }
	    });
	    // XXX mark the comment seen
	  },
	});
      });
    });

    eventBus.vent.on('code-review:state-change', function (review) {
      var action;

      if (review.isApproved())
	action = 'was approved';
      else if (review.isRejected())
	action = 'was rejected';
      else
	action = 'was moved back to pending';

      notificationService.add({
	id: buildNotificationID(['state-change', review.getId()]),
	image: REVIEW_IMG,
	message: 'Review "' + review.getTitle() + '" ' + action,
	onClick: function () {
	  console.log('review notification was clicked', {review:review});
	  megaMenuService.selectPage('codeReviewPage');
	  codeReviewPage.openReview(review);
	},
      });
    });
  }
  runModule.$inject = [ 'notification-service', 'mega-menuService',
    'code-review-page' ];

  function getFactory(notificationService, megaMenuService, codeReviewPage) {
    return {
      notifyPendingReview: function (review) {
	addPendingReviewNotification(notificationService, megaMenuService,
	  codeReviewPage, review);
      },
    };
  }
  getFactory.$inject = [ 'notification-service', 'mega-menuService',
    'code-review-page' ];

  return {
    run : runModule,
    factorys: {
      'code-review-notifications-service': getFactory,
    },
  };
});
