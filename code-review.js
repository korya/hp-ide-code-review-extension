define([
  './code-review-presenter',
], function(presenter) {
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
	presenter.run(dialogService);
      }
    ],
  };
});
