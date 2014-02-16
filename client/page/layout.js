define([
  '../utils',
], function (utils) {

  var paneDirective = function () {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {},
      templateUrl: utils.cwd() + '/page/html/pane.html',
    };
  }

  /** Inspired by ui.bootstrap.tabs */

  var tabsetController = ['$scope', function TabsetCtrl($scope) {
    var ctrl = this,
	tabs = ctrl.tabs = $scope.tabs = [];

    ctrl.select = function(tab) {
      angular.forEach(tabs, function(tab) {
	tab.active = false;
      });
      tab.active = true;
    };

    ctrl.addTab = function addTab(tab) {
      tabs.push(tab);
      if (tabs.length === 1 || tab.active) {
	ctrl.select(tab);
      }
    };

    ctrl.removeTab = function removeTab(tab) {
      var index = tabs.indexOf(tab);
      //Select a new tab if the tab to be removed is selected
      if (tab.active && tabs.length > 1) {
	//If this is the last tab, select the previous tab. else, the next tab.
	var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
	ctrl.select(tabs[newActiveIndex]);
      }
      tabs.splice(index, 1);
    };
  }];

  var tabsetDirective = function() {
    return {
      restrict: 'EA',
      transclude: true,
      replace: true,
      scope: {},
      controller: tabsetController,
      templateUrl: utils.cwd() + '/page/html/tabset.html',
      link: function(scope, element, attrs) {
	scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
	scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
	scope.type = angular.isDefined(attrs.type) ? scope.$parent.$eval(attrs.type) : 'tabs';
      }
    };
  };

  var tabDirective = ['$parse', function($parse) {
    return {
      require: '^tabset',
      restrict: 'EA',
      replace: true,
      templateUrl: utils.cwd() + '/page/html/tab.html',
      transclude: true,
      scope: {
	heading: '@',
	onSelect: '&select', //This callback is called in contentHeadingTransclude
	//once it inserts the tab's content into the dom
	onDeselect: '&deselect'
      },
      controller: function() {
	//Empty controller so other directives can require being 'under' a tab
      },
      compile: function(elm, attrs, transclude) {
	return function postLink(scope, elm, attrs, tabsetCtrl) {
	  var getActive, setActive;
	  if (attrs.active) {
	    getActive = $parse(attrs.active);
	    setActive = getActive.assign;
	    scope.$parent.$watch(getActive, function updateActive(value, oldVal) {
	      // Avoid re-initializing scope.active as it is already initialized
	      // below. (watcher is called async during init with value ===
	      // oldVal)
	      if (value !== oldVal) {
		scope.active = !!value;
	      }
	    });
	    scope.active = getActive(scope.$parent);
	  } else {
	    setActive = getActive = angular.noop;
	  }

	  scope.$watch('active', function(active) {
	    // Note this watcher also initializes and assigns scope.active to the
	    // attrs.active expression.
	    setActive(scope.$parent, active);
	    if (active) {
	      tabsetCtrl.select(scope);
	      scope.onSelect();
	    } else {
	      scope.onDeselect();
	    }
	  });

	  scope.disabled = false;
	  if ( attrs.disabled ) {
	    scope.$parent.$watch($parse(attrs.disabled), function(value) {
	      scope.disabled = !! value;
	    });
	  }

	  scope.select = function() {
	    if ( ! scope.disabled ) {
	      scope.active = true;
	    }
	  };

	  tabsetCtrl.addTab(scope);
	  scope.$on('$destroy', function() {
	    tabsetCtrl.removeTab(scope);
	  });


	  //We need to transclude later, once the content container is ready.
	  //when this link happens, we're inside a tab heading.
	  scope.$transcludeFn = transclude;
	};
      }
    };
  }];

  var tabHeadingTranscludeDirective = [function() {
    return {
      restrict: 'A',
      require: '^tab',
      link: function(scope, elm, attrs, tabCtrl) {
	scope.$watch('headingElement', function updateHeadingElement(heading) {
	  if (heading) {
	    elm.html('');
	    elm.append(heading);
	  }
	});
      }
    };
  }];

  var tabContentTranscludeDirective = function() {
    return {
      restrict: 'A',
      require: '^tabset',
      link: function(scope, elm, attrs) {
	var tab = scope.$eval(attrs.tabContentTransclude);

	//Now our tab is ready to be transcluded: both the tab heading area
	//and the tab content area are loaded.  Transclude 'em both.
	tab.$transcludeFn(tab.$parent, function(contents) {
	  angular.forEach(contents, function(node) {
	    if (isTabHeading(node)) {
	      //Let tabHeadingTransclude know.
	      tab.headingElement = node;
	    } else {
	      elm.append(node);
	    }
	  });
	});
      }
    };

    function isTabHeading(node) {
      return node.tagName &&  (
	node.hasAttribute('tab-heading') ||
	node.hasAttribute('data-tab-heading') ||
	node.tagName.toLowerCase() === 'tab-heading' ||
	node.tagName.toLowerCase() === 'data-tab-heading'
      );
    }
  };

  return {
    init: function (module) {
      module.directive('pane', paneDirective);
      module.directive('tabset', tabsetDirective);
      module.directive('tab', tabDirective);
      module.directive('tabHeadingTransclude', tabHeadingTranscludeDirective);
      module.directive('tabContentTransclude', tabContentTranscludeDirective);
    },
  };
});
