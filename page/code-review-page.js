define([
  'scripts/core/event-bus',
  '../review.js',
  './layout.js',
  './compare-edior-ang',
  './location',
  'css!./less/page',
], function (eventBus, Review, layout, compareEditorAng, Location) {
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
    return angular.element($('.codeReviewPage')).scope();
  }

  function showDiffTab(commit, file, type) {
    var $scope = getPageScope();
    var id = type + '@' + commit.sha1 + ':' + file.path;
    var diffTab = _.find($scope.diffTabs, { editor: {id: id} })

    if (diffTab) {
      $scope.$apply(function () {
	diffTab.active = true;
      });
      return;
    }

    $scope.$apply(function () {
      var repo = $scope.review.getRepository().id;
      var sha1Abbrev = buildSha1Abbrev(commit.sha1);

      function defineFileParams(repo, revision, filepath, name, content) {
	var params = {
	  name: name,
	  content: content,
	};

	if (content === undefined) {
	  params.git = {
	    repository: repo,
	    revision: revision,
	    path: filepath,
	  };
	}
	return params;
      }

      diffTab = {
	active: true,
	editor: {
	  id: id,
	  title: sha1Abbrev + ' ' + file.path,
	  type: type,
	},
	oldFile: defineFileParams(repo, commit.sha1 + '~', file.path,
	  sha1Abbrev + '~' + ':' + file.path,
	  (file.action === 'added') ? '' : undefined),
	newFile: defineFileParams(repo, commit.sha1, file.path,
	  sha1Abbrev + ':' + file.path,
	  (file.action === 'removed') ? '' : undefined),
	comments: $scope.review.getComments(file.path),
      };
      $scope.diffTabs.push(diffTab);
    });
  }

  function showFileDiff(filename, line) {
    var $scope = getPageScope();
    var commit = $scope.review.getBaseCommit();
    var file = _.find($scope.files, {
      commit: commit,
      fileInfo : { path : filename },
    });

    /* XXX set editor cursor to a specified line (if was specified) */
    showDiffTab(commit, file.fileInfo, 'twoWay');
    if (line) {
      $scope.setThreadFilter(filename, line);
    }
  }


  function onNodeDblClick(node) {
    var commit = node.data.commit;
    var file = node.data.file;

    /* We don't want to be in dynatree context -- it catches our exceptions */
    setTimeout(function () {
      showDiffTab(commit, file, 'twoWay');
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

  function addFileToTree(commit, file, tree) {
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
      commit: commit,
      file: file,
    });
  }

  function showCommitInfo(review, sha1) {
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
      var $scope = getPageScope();
      for (var i = 0; i < commit.files.length; i++) {
	addFileToTree(commit, commit.files[i], treeRoot);

	$scope.files.push({
	  fileInfo: commit.files[i],
	  commit: commit,
	});
      }
      $scope.$apply();
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

  function updateThreadFilters($scope) {
    if (!$scope.files.length) {
      $scope.thread = {};
      $scope.thread.filters = [];
      return;
    }

    var threads = [];
    var hash = {};
    /* Find all specific commented locations */
    _.forEach($scope.comments, function (comment) {
      var l = comment.location;
      if (!l.isSpecific()) return;
      if (!hash[l.file]) hash[l.file] = {};
      hash[l.file][l.line] = l;
    });
    /* Make sure all files are present */
    _.forEach($scope.files, function (obj) {
      var filepath = obj.fileInfo.path;
      if (!hash[filepath]) hash[filepath] = {};
    });
    /* Now we can create the filters */
    _.forOwn(hash, function (lines, file) {
      _.forOwn(lines, function (l, line) {
	threads.push(Location.filterFactory(l));
      });
      /* Add file wide only filter */
      threads.unshift(Location.filterFactory(new Location(file, -1)));
      /* Add all file filter */
      threads.unshift(Location.filterFactory(new Location(file)));
    });
    /* Add review wide only filter */
    threads.unshift(Location.filterFactory(new Location(-1)));
    /* Add all filter */
    threads.unshift(Location.filterFactory(new Location()));

    $scope.thread.filters = threads;
    $scope.thread.filter = $scope.thread.filters[0];
  }

  var pageController = [
    '$scope', 'code-review-service', 'mega-menuService', 'git-service',
    function ($scope, codeReviewService, megaMenuService, gitService) {
      _gitService = gitService;

      $scope.removeDiffTab = function (file) {
	var index = $scope.diffTabs.indexOf(file);
	if (index !== -1) $scope.diffTabs.splice(index, 1);
      }

      $scope.addComment = function () {
	var review = $scope.review;
	var message = $scope.comment.message;
	var file = $scope.thread.filter.file;
	var line = $scope.thread.filter.line;

	if (!$scope.thread.filter.isSpecific()) return;

	if (!file || !file.trim()) { file = undefined; line = undefined; }
	else if (line === -1) line = undefined;

	codeReviewService.commentReview(review, message, file, line).done(function () {
	  $scope.comment.message = '';
	  $scope.$apply();
	});
      }

      $scope.setThreadFilter = function (file, line) {
	var filter = _.find($scope.thread.filters, {file:file, line:line});

	if (!filter) filter = Location.filterFactory(new Location(file, line)); 
	$scope.thread.filter = filter;
      }

      $scope.approveReview = function () {
	codeReviewService.changeReviewState($scope.review, 'approved');
      }
      $scope.rejectReview = function () {
	codeReviewService.changeReviewState($scope.review, 'rejected');
      }
      $scope.resetReviewState = function () {
	codeReviewService.changeReviewState($scope.review, 'pending');
      }

      $scope.review = undefined;

      $scope.$watch('review', function (review, oldVal, $scope) {
	$scope.files = [];
	$scope.diffTabs = [];
	$scope.comments = [];

	if (!review) return;

	$scope.review.creationDate = prettifyDate(review.creationDate);
	$scope.review.lastUpdatedDate = prettifyDate(review.lastUpdatedDate);
	$scope.review.isMeReviwer = review.isReviewer(codeReviewService.getMySelf().id);
	$scope.comments = _.map(review.getComments(), function (c) {
	  var comment = _.clone(c);

	  comment.location = new Location(comment.file, comment.line);
	  comment.prettyDate = prettifyDate(comment.date);
	  return comment;
	});

	var $commits = $('.codeReviewPage .details .commit .filetree-placeholder');
	$commits.empty();
	$commits.append(showCommitInfo(review, review.getBaseCommit().sha1));
      });

      $scope.$watch('files', function (files, oldVal, $scope) {
	updateThreadFilters($scope);
      }, true);

      $scope.$watch('comments', function (comments, oldVal, $scope) {
	updateThreadFilters($scope);
      }, true);

      $scope.$watch('thread.filter', function (threadFilter, oldVal, $scope) {
	if (!threadFilter) {
	  $scope.comment = {};
	  $scope.commentFilter = undefined;
	  return;
	}

	$scope.comment.message = '';
	$scope.commentFilter = function CommentFilter(comment) {
	  return threadFilter.filter(comment.location);
	}
      });
    }
  ];

  /* XXX I did not find a better way to compile and append a dynamically
   * generated HTML.
   */
  var threadHeaderDirective = [
    '$compile',
    function ($compile) {
      var HEADER_THREAD = 'headerThread';

      function getThreadHeader(threadFilter) {
	var file = threadFilter.file;
	var line = threadFilter.line;

	function addLink(text) {
	  return '<location-link data-location="' + HEADER_THREAD + '">' +
	    text + '</location-link>';
	}

	if (!threadFilter.isSpecific()) {
	  if (file) return 'Showing all comments for file ' + addLink(file);
	  return 'Showing all review comments'
	}

	if (file && line) return 'Comment line ' + line + ' in file ' + addLink(file);
	if (file) return 'Comment file ' + addLink(file);
	return 'Comment the whole review';
      }
      function getThreadHeaderHTML(threadFilter) {
	return '<span class="header">' + getThreadHeader(threadFilter) + '</span>';
      }

      return {
	restrict: 'E',
	replace: true,
	scope: {},
	link: function (scope, elem, attrs) {
	  if (angular.isDefined(attrs.thread)) {
	    scope.$parent.$watch(attrs.thread, function (newVal) {
	      elem.empty();
	      if (!newVal) {
		scope[HEADER_THREAD] = undefined;
		return;
	      }
	      scope[HEADER_THREAD] = newVal;
	      elem.append($compile(getThreadHeaderHTML(newVal))(scope));
	    });
	  }
	},
      };
    }
  ];

  var locationLinkDirective = function () {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      templateUrl: 'extensions/hpsw/code-review/1.00/page/html/location-link.html',
      link: function (scope, element, attrs) {
	if (angular.isDefined(attrs.location)) {
	  scope.$watch(attrs.location, function (newVal) {
	    var loc = newVal;
	    if (!loc || !loc.file) return;
	    element.attr('title', 'Show changes for ' + loc.file);
	    element.on('click', function () {
	      showFileDiff(loc.file, loc.line);
	      scope.$apply();
	    });
	  });
	}
      },
    };
  };

  var codeReviewPage = {
    openReview: function (review) {
      var $scope = getPageScope();

      if ($scope.review) {
	if ($scope.review.getId() === review.getId()) {
	  return;
	}

	codeReviewPage.closeReview();
      }

      $scope.review = new Review(review);
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

      extModule.directive('locationLink', locationLinkDirective);
      extModule.directive('threadHeader', threadHeaderDirective);
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
      compareEditorAng.init(extModule);
    },
    factorys: {
      'code-review-page': function () {
	return codeReviewPage;
      }
    },
  };
});
