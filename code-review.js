define([
  './code-review-service',
  './code-review-presenter',
], function(reviewService, presenter) {
  'use strict';

  return {
    config : [
      'ide-layoutServiceProvider',
      function (layoutServiceProvider) {
	console.log("[[code-review config]]");
	presenter.config(layoutServiceProvider);
      }
    ],
    run : [
      'dialog-service',
      function(dialogService) {
	console.log("[[code-review run]]");
	reviewService.run();
	presenter.run(dialogService);
      }
    ],
  };
});
