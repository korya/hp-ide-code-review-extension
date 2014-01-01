define([
], function () {

  var paneDirective = function () {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      require: 'title',
      scope: {
	title: '@',
      },
      templateUrl: 'extensions/hpsw/code-review/1.00/page/html/pane.html',
    };
  }

  var tabbableDirective = function () {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {},
      controller: [
	'$scope', '$element',
	function ($scope, $element) {
	  var tabs = $scope.tabs = [];

	  $scope.select = function (tab) {
	    angular.forEach(tabs, function (tab) {
	      tab.selected = false;
	    });
	    tab.selected = true;
	  }

	  this.addTab = function (tab) {
	    if (tabs.length == 0) $scope.select(tab);
	    tabs.push(tab);
	  }
	}
      ],
      templateUrl: 'extensions/hpsw/code-review/1.00/page/html/tabbable.html',
    };
  }

  var tabDirective = function () {
    return {
      require: '^tabbable',
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {
	title: '@',
      },
      link: function (scope, element, attrs, tabsCtrl) {
	tabsCtrl.addTab(scope);
      },
      templateUrl: 'extensions/hpsw/code-review/1.00/page/html/tab.html',
    };
  }

  return {
    init: function (extModule) {
      extModule.directive('pane', paneDirective);
      extModule.directive('tabbable', tabbableDirective);
      extModule.directive('tab', tabDirective);
    },
  };
});
