define([
  'scripts/core/event-bus',
  'css!./less/page',
], function (eventBus) {
  'use strict';

  function getPageScope() {
    var $scope = angular.element($('.codeReviewPage')).scope();

    console.error('scope:', {s:$scope});
    return $scope;
  }

  var pageConfig = [
    'mega-menuServiceProvider',
    function (megaMenuServiceProvider) {
      megaMenuServiceProvider.registerPage({
	id: 'codeReviewPage',
	title: 'Code Review',
	order: 0,
	render: function () {
	  return function (domContainer) {
	    $(domContainer).append($('<data-code-review-page>'));
	  };
	},
      });
    }
  ];

  var pageController = [
    '$scope', 'code-review-service', 'mega-menuService',
    function ($scope, codeReviewService, megaMenuService) {
      $scope.review = undefined;
    }
  ];

  var codeReviewPage = {
    openReview: function (review) {
      var $scope = getPageScope();

      $scope.apply(function () {
	$scope.review = _.clone(review);
      });
    },
    closeReview: function () {
      var $scope = getPageScope();

      $scope.apply(function () {
	$scope.review = undefined;
      });
    },
  };

  return {
    init: function (extModule) {
      extModule.config(pageConfig);

      extModule.controller('code-review-page', pageController);

      extModule.directive('codeReviewPage', function () {
	return {
	  restrict: 'E',
	  replace: true,
	  templateUrl: 'extensions/hpsw/code-review/1.00/page/html/page.html'
	};
      });

      extModule.directive('ngEnter', function () {
	return function ($scope, element, attrs) {
	  element.bind("keydown keypress", function (event) {
	    if (event.which === 13) {
	      $scope.$apply(function () { $scope.$eval(attrs.ngEnter); });
	      event.preventDefault();
	    }
	  });
	};
      });
    },
    factorys: {
      'code-review-page': codeReviewPage,
    },
  };
});
