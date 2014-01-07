define([
  'scripts/core/event-bus',
  'css!./less/dashboard',
], function(eventBus) {
  'use strict';

  function LocalReview(review) {
    this.id = review.getId();
    this.title = review.getTitle();
    this.description = review.getDescription();
    this.state = review.getState();
    this.approved = review.isApproved();
    this.rejected = review.isRejected();
    this.author = review.getAuthor();
    this.reviewers = [review.getReviewer()];
    this.creationDate = review.getCreationDate();
    this.lastUpdatedDate = review.getLastUpdateDate();
    this.original = review;
  }

  function cmpReviewState(review) {
    /* Order: pending < rejected < approved */
    if (review.approved) return 1;
    if (review.rejected) return 0;
    /* pending */        return -1;
  }

  function toLocalReview(review) {
    return new LocalReview(review);
  }

  function dashboardConfig(megaMenuServiceProvider) {
    megaMenuServiceProvider.registerPage({
      id: 'codeReviewDashboard',
      title: 'Review Dashboard',
      order: 0,
      render: function () {
	return function (domContainer) {
	  $(domContainer).append($('<data-code-review-dashboard>'));
	};
      },
    });
  }
  dashboardConfig.$inject = ['mega-menuServiceProvider'];

  function dashboardController($scope, codeReviewService, megaMenuService,
    codeReviewPage, codeReviewNotificationService)
  {
    $scope.reviews = [];
    codeReviewService.getPendingReviews().then(function (reviews) {
      $scope.$apply(function () {
	$scope.reviews = _.map(reviews, toLocalReview);
	_.forEach(reviews, function (review) {
	  if (review.isPending()) {
	    codeReviewNotificationService.notifyPendingReview(review);
	  }
	});
      });
    }, function (error) {
      console.error('Failed to load reviews:', {error:error});
      $scope.$apply(function () {
	$scope.error = 'Failed to load reviews...';
      });
    });

    $scope.sortModes = [
      { name: 'Creation Date', field: '-creationDate' },
      { name: 'Last Update Date', field: ['-lastUpdatedDate', '-creationDate'] },
      { name: 'Author', field: ['+author.name', '-lastUpdatedDate'] },
      { name: 'State', field: [cmpReviewState, '-lastUpdatedDate'] },
    ];
    $scope.selectedSortMode = $scope.sortModes[0];

    eventBus.vent.on('code-review:add', function (review) {
      $scope.$apply(function () {
	$scope.reviews.push(toLocalReview(review));
      });
    });
    eventBus.vent.on('code-review:rem', function (review) {
      $scope.$apply(function () {
	$scope.reviews = _.remove($scope.reviews, { id:review.getId() });
      });
    });
    eventBus.vent.on('code-review:comments-add', function (review) {
      var idx = _.findIndex($scope.reviews, { id:review.getId() });
      if (idx < 0) return;
      $scope.$apply(function () {
	$scope.reviews[idx] = toLocalReview(review);
      });
    });
    eventBus.vent.on('code-review:state-change', function (review) {
      var idx = _.findIndex($scope.reviews, { id:review.getId() });
      if (idx < 0) return;
      $scope.$apply(function () {
	$scope.reviews[idx] = toLocalReview(review);
      });
    });

    $scope.openReview = function(review) {
      codeReviewPage.openReview(review.original);
      megaMenuService.selectPage('codeReviewPage');
    };
  }
  dashboardController.$inject = ['$scope', 'code-review-service',
    'mega-menuService', 'code-review-page', 'code-review-notifications-service'
  ];

  return {
    init: function (extModule) {
      extModule.config(dashboardConfig);

      extModule.controller('code-review-dashboard', dashboardController);

      extModule.directive('codeReviewDashboard', function () {
	return {
	  restrict: 'E',
	  replace: true,
	  templateUrl: 'extensions/hpsw/code-review/1.00/dashboard/dashboard.html'
	};
      });
    },
  };
});
