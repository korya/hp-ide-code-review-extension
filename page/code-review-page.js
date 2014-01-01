define([
  'scripts/core/event-bus',
  '../review.js',
  './layout.js',
  'css!./less/page',
], function (eventBus, Review, layout) {
  'use strict';

  var _gitService;

  function buildSha1Abbrev(sha1) {
    return sha1.substr(0, 7); // Just truncate it
  }
  function buildCommitName(c, maxLen) {
    var message = buildSha1Abbrev(c.sha1) + ' "' + c.message + '"';
    if (message.length > maxLen) message = message.substr(0, maxLen-3) + '...';
    return message;
  }

  function prettifyDate(date) {
    return (new Date(date)).toGMTString();
  }

  function getPageScope() {
    var $scope = angular.element($('.codeReviewPage')).scope();

    console.error('scope:', {s:$scope});
    return $scope;
  }

  function showDiffTab(file) {
    var $scope = getPageScope();

    $scope.$apply(function () {
      $scope.openFiles.push({title: file});
    });
  }

  function onNodeDblClick(node) {
    var $scope = getPageScope();
    var review = $scope.review;
    var repo = review.getRepository().id;
    var commit = node.data.commit;
    var file = node.data.file;

    /* We don't want to be in dynatree context -- it catches our exceptions */
    setTimeout(function () {
      console.log('git diff ' + commit.sha1 + '~ ' + commit.sha1 + ' ' + file.path);
      showDiffTab(file.path);
    });
  }

  /* Taken from project-tree code */
  function getFileTypeClass(fileName) {
    var fileExtension = fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();

    switch (fileExtension) {
      case 'png':
	return 'image';
      case 'jpg':
	return 'image';
      default:
	return fileExtension;
    }
  }

  function getActionClass(action) {
    switch (action) {
      case 'added': return 'code-review-added-file';
      case 'removed': return 'code-review-removed-file';
      case 'changed': return 'code-review-changed-file';
      default: return '';
    }
  }

  function getFileTooltip(file) {
    switch (file.action) {
      case 'added': return 'New file';
      case 'removed': return 'Removed file';
      case 'changed': return 'Changed file';
      default: return '';
    }
  }

  function addFileToTree(reviewId, commit, file, tree) {
    var splitpath = file.path.replace(/^\/|\/$/g, '').split('/');
    var i;

    for (i = 0; i < splitpath.length - 1; i++) {
      var dirname = splitpath[i];
      var dir = _.find(tree.getChildren(), { data: { title: dirname } });

      if (dir) {
	tree = dir;
      } else {
	tree = tree.addChild({
	  title: dirname,
	  isFolder: true,
	});
      }
    }

    tree.addChild({
      title: splitpath[i],
      key: file.path,
      tooltip: getFileTooltip(file),
      addClass: getFileTypeClass(file.path) + '-icon ' + getActionClass(file.action),
      reviewId: reviewId,
      commit: commit,
      file: file,
    });
  }

  function showCommitInfo(review, sha1) {
    var reviewId = review.getId();
    var repo = review.getRepository().id;
    var $filetree = $('<div>');
    var treeRoot;

    /* These settings are taken from project-tree code */
    $filetree.dynatree({
      debugLevel: 0,
      minExpandLevel: 1,
      persist: true,
      fx: { height: "toggle", duration: 200 },
      onDblClick: onNodeDblClick,
    });

    treeRoot = $filetree.dynatree('getRoot').addChild({
      title: buildSha1Abbrev(sha1),
      isFolder: true,
      tooltip: 'Commit ' + buildSha1Abbrev(sha1) + ' file tree',
    });

    treeRoot.setLazyNodeStatus(DTNodeStatus_Loading);
    _gitService.commitShow(repo, sha1).then(function (commit) {
      treeRoot.data.title = buildCommitName(commit, 40);
      treeRoot.data.tooltip = [
        'SHA1: ' + commit.sha1,
        'Author: ' + commit.author,
        'Author Date: ' + commit.authorDate,
        'Committer: ' + commit.committer,
        'Commit Date: ' + commit.commitDate,
        'Message: ' + commit.message,
      ].join('\n');
      treeRoot.setLazyNodeStatus(DTNodeStatus_Ok);
      for (var i = 0; i < commit.files.length; i++) {
	addFileToTree(reviewId, commit, commit.files[i], treeRoot);
      }
    }, function (error) {
      treeRoot.setLazyNodeStatus(DTNodeStatus_Error);
    });

    return $filetree;
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
    '$scope', 'code-review-service', 'mega-menuService', 'git-service',
    function ($scope, codeReviewService, megaMenuService, gitService) {
      _gitService = gitService;

      $scope.review = undefined;

      $scope.$watch('review', function (review, oldVal, $scope) {
	if (!review) {
	  $scope.openFiles = [];
	  $scope.discussion = [];
	  return;
	}

	$scope.openFiles = [];
	$scope.discussion = _.map(review.getComments(), function (c) {
	  var comment = _.clone(c);

	  comment.prettyDate = prettifyDate(comment.date);
	  return comment;
	});

	var $commits = $('.codeReviewPage .details .commit .filetree-placeholder');
	$commits.empty();
	$commits.append(showCommitInfo(review, review.getBaseCommit().sha1));
      });
    }
  ];

  var codeReviewPage = {
    openReview: function (review) {
      var $scope = getPageScope();

      $scope.review = new Review(review);
      $scope.review.creationDate = prettifyDate(review.creationDate);
      $scope.review.lastUpdatedDate = prettifyDate(review.lastUpdatedDate);
      if (!$scope.$$phase) { $scope.$apply(); }
    },
    closeReview: function () {
      var $scope = getPageScope();

      $scope.review = undefined;
      if (!$scope.$$phase) { $scope.$apply(); }
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

      layout.init(extModule);
    },
    factorys: {
      'code-review-page': function () {
	return codeReviewPage;
      }
    },
  };
});
