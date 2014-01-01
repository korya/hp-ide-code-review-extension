define([
  'css!./less/layout',
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

	  /* Tab is closed by a tabbable: ask the tab to be closed */
	  $scope.remove = function (tab) {
	    tab.remove();
	  }

	  this.addTab = function (tab) {
	    if (tabs.length == 0) $scope.select(tab);
	    tabs.push(tab);
	  }

	  /* Tab is going to be closed, we should remove it */
	  this.removeTab = function (tab) {
	    var index = tabs.indexOf(tab);
	    //Select a new tab if the tab to be removed is selected
	    if (tab.selected && tabs.length > 1) {
	      //If this is the last tab, select the previous tab. else, the next tab.
	      var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
	      $scope.select(tabs[newActiveIndex]);
	    }
	    tabs.splice(index, 1);
	  };
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
	onRemove: '&',
      },
      link: function (scope, element, attrs, tabsCtrl) {
	tabsCtrl.addTab(scope);
	scope.remove = function () {
	  scope.onRemove();
	};
	scope.$on('$destroy', function() {
	  tabsCtrl.removeTab(scope);
	});
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
