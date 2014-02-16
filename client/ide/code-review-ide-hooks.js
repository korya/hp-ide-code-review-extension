define([
  'css!./less/code-review-ide',
], function () {

  function buildSha1Abbrev(sha1) {
    return sha1.substr(0, 7); // Just truncate it
  }
  function buildCommitName(c, maxLen) {
    var message = buildSha1Abbrev(c.sha1) + ' "' + c.message + '"';
    if (message.length > maxLen) message = message.substr(0, maxLen-3) + '...';
    return message;
  }

  var createRequestController = [
    '$scope', 'code-review-service', 'git-service', 'projects-service',
    function CreateRequestController($scope, codeReviewService, gitService,
      projectsService)
    {
      $scope.submitRequest = function () {
	var r = $scope.request;
	var promise;

	$scope.showErorrs = false;
	$scope.serverError = '';

	if ($scope.form.$invalid) {
	  $scope.showErorrs = true;
	  return (new $.Deferred()).reject('validation error').promise();
	}

	promise = codeReviewService.createNewReviewRequest(r.localRepo,
	  r.remote, r.title, r.desc, r.reviewer, r.commit);
	promise.fail(function (err) {
	  $scope.serverError = JSON.stringify(err);
	  $scope.showErorrs = true;
	});

	return promise;
      }

      $scope.$watch('reviewers', function (reviewers) {
	$scope.request.reviewer = undefined;
	if (reviewers && reviewers.length) $scope.request.reviewer = reviewers[0];
	_.forEach(reviewers, function (user) {
	  user.label = user.name + ' ' + '<' + user.id + '>';
	});
      });

      $scope.$watch('commits', function (commits) {
	$scope.request.commit = undefined;
	if (commits && commits.length) $scope.request.commit = commits[0];
	_.forEach(commits, function (commit) {
	  commit.label = buildCommitName(commit, 80);
	});
      });

      $scope.$watch('remotes', function (remotes) {
	$scope.request.remote = undefined;
	if (remotes && remotes.length) $scope.request.remote = remotes[0];
	_.forEach(remotes, function (remote) {
	  remote.label = remote.name + ' ' + remote.url;
	});
      });

      $scope.request = {
	localRepo: projectsService.getActiveProject().id,
      };

      gitService.log($scope.request.localRepo).then(function (commits) {
	$scope.commits = commits;
	$scope.$apply();
      });
      codeReviewService.getReviewers().then(function (reviewers) {
	$scope.reviewers = reviewers;
	$scope.$apply();
      });
      gitService.getRemotes($scope.request.localRepo).then(function (remotes) {
	$scope.remotes = remotes;
	$scope.$apply();
      });
    }
  ];

  var createRequestDirective = [
    function () {
      return {
	restrict: 'E',
	replace: true,
	scope: {},
	templateUrl: 'extensions/hpsw/code-review/1.00/ide/html/create-dialog.html',
	controller: createRequestController,
      };
    }
  ];

  var codeReviewCreateCommand = [
    '$compile', '$rootScope', 'dialog-service', 'code-review-service',
    'projects-service',
    function ($compile, $rootScope, dialogService, codeReviewService,
      projectsService)
    {
      return function CodeReviewCreateCommand() {
	var element;

	var dialog = dialogService.createDialog('Create pull request', {
	  closeOnEscape: true,
	  draggable: true,
	  hide: 500,
	  modal: true,
	  show: 800,
	  width: 600,
	  height: 380,
	}, [
	  {
	    label: 'OK',
	    title: 'OK',
	    handler: function () {
	      // XXX Get access to an isolate scope of the request
	      var scope = element.find('form').scope();

	      scope.submitRequest().done(function () {
		dialog.close();
	      });
	    }
	  },
	  {
	    label: 'Cancel',
	    handler: function () {
	      dialog.close();
	    }
	  }
	], function (dialog) {
	  element = $compile('<code-review-create-request />')($rootScope);
	  $(dialog.getDomElement()).append(element);
	});
      };
    }
  ];

  var ideConfig = [
    'commands-serviceProvider', 'conditions-serviceProvider', 'menu-serviceProvider',
    function IdeConfig(commandsProvider, conditionsProvider, menuProvider) {
      commandsProvider.register('code-review.create', codeReviewCreateCommand,
	'activeProjectCondition');

      menuProvider.registerMenuItem({
	id : 'code-review.create',
	title : 'New Review Request',
	parentId : 'coreMainMenuProject',
	order : -1,
	commandId : 'code-review.create'
      });
    }
  ];

  return {
    init: function (extModule) {
      extModule.config(ideConfig);
      extModule.directive('codeReviewCreateRequest', createRequestDirective);
    },
  };
});
