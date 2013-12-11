define([
  './code-review-presenter',
], function(presenter) {
  'use strict';

  return {
    config : [
      'ide-layoutServiceProvider',
      function(layoutService) {
	console.log("[[code-review config]]");
	presenter.init(layoutService);
      }
    ],
  };
});
