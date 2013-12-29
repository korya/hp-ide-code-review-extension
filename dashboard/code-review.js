define([
  'scripts/core/event-bus',
  'css!./css/dashboard',
], function(eventBus) {
  'use strict';

  function LocalReview(review) {
    this.id = review.getId();
    this.title = review.getTitle();
    this.description = review.getDescription();
    this.state = review.getState();
    this.author = review.getAuthor();
    this.reviewers = [review.getReviewer()];
    this.creationDate = review.getCreationDate();
    this.lastUpdatedDate = review.getLastUpdateDate();
  }

  function toLocalReview(review) {
    return new LocalReview(review);
  }

  function dashboardConfig(megaMenuServiceProvider) {
    megaMenuServiceProvider.registerPage({
      id: 'codeReviewDashboardPage',
      title: 'Code Reviews',
      order: 0,
      render: function () {
	return function (domContainer) {
	  $(domContainer).append($('<data-code-review-dashboard>'));
	};
      },
    });
  }
  dashboardConfig.$inject = ['mega-menuServiceProvider'];

  function dashboardController($scope, codeReviewService, megaMenuService) {
    $scope.reviews = [];
    codeReviewService.getPendingReviews().then(function (reviews) {
      $scope.reviews = _.map(reviews, toLocalReview);
    }, function (error) {
      $scope.error = 'Failed to load reviews...';
      console.error('Failed to load reviews:', {error:error});
    });

    $scope.sortModes = [
      { name: 'Creation Date', field: '-creationDate' },
      { name: 'Last Update Date', field: '-lastUpdatedDate' },
      { name: 'Author', field: '+author.name' },
      { name: 'State', field: 'state' },
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

//     $scope.openProject = function(newProject) {
//       projectsService.activateProject(newProject.originalProject);
//       megaMenuService.selectPage('ide-page');
//     };
  }
  dashboardController.$inject = ['$scope', 'code-review-service', 'mega-menuService'];

  return {
    init: function (extModule) {
      extModule.config(dashboardConfig);

      extModule.controller('code-review-dashboard', dashboardController);

      extModule.directive('codeReviewDashboard', function () {
	return {
	  restrict: 'E',
	  templateUrl: 'extensions/hpsw/code-review/1.00/dashboard/dashboard.html'
	};
      });
    },
  };
});
