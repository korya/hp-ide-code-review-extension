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
      'dialog-service', 'git-service', 'projects-service', 'editors-service',
      function(dialogService, gitService, projectsService, editorsService) {
	console.log("[[code-review run]]");
	reviewService.run(gitService, projectsService);
	presenter.run(dialogService, editorsService);
      }
    ],
  };
});
