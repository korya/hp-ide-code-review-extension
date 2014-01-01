define([
], function () {

  var paneDirective = {
    restrict: 'E',
    transclude: true,
    replace: true,
    require: 'title',
    scope: {
      title: '@',
    },
    templateUrl: 'extensions/hpsw/code-review/1.00/page/html/pane.html',
  };

  return {
    init: function (extModule) {
      extModule.directive('pane', function () {
	return paneDirective;
      });
    },
  };
});
