define([
  'scripts/core/event-bus',
  './comment-annotations',
  './review-event',
  /* Assume dynatree was already loaded by project-tree */
  'css!./css/code-review.css',
], function (eventBus, CommentAnnotator, ReviewEvent) {
  'use strict';

  var _codeReviewService, _dialogService, _editorsService, _layoutService,
      _gitService, _projectsService, _userService;
  var $holder, $incoming, $reviewList, $reviewListEmptyMessage;

  function getProjectRepo(project) {
    return {
      id: project.id,
    };
  }

  function buildUserName(user) {
    return user.name + ' &lt' + user.id + '&gt';
  }
  function buildSha1Abbrev(sha1) {
    return sha1.substr(0, 7); // Just truncate it
  }
  function buildCommitName(c, maxLen) {
    var message = buildSha1Abbrev(c.sha1) + ' "' + c.message + '"';
    if (message.length > maxLen) message = message.substr(0, maxLen-3) + '...';
    return message;
  }
  function buildReviewItemId(review) {
    return 'code-review-item-' + review.getId();
  }

  function findReviewSummaryElement(review) {
    return $('#' + buildReviewItemId(review));
  }
  function findReviewDetailsElement(review) {
    return $('#' + buildReviewItemId(review) + '-details');
  }
  function getReviewById(reviewId) {
    return $('#code-review-item-' + reviewId).data('review');
  }

  function renderCommentTree(review, file, line, reviewListener) {
    var $holder = $('<div>').addClass('code-review-comment-tree');
    var $discussion = $('<ul></ul>').addClass('code-review-discussion');
    var $commentInput = $('<input type="text" name="review-comment"/>');
    var $commentBtn = $('<button type="button" name="review-comment">Respond</button>');

    $commentBtn.click(function () {
      var comment = $commentInput.val();
      _codeReviewService.commentReview(review, comment, file, line)
	.done(function () {
	  $commentInput.val('');
	});
    });
    $commentInput.keypress(function (event) {
      if (event.keyCode === 13) {
	event.preventDefault();
	$commentBtn.trigger("click");
      }
    });

    appendReviewComments($discussion, review.getComments(file, line));

    $holder
      .append($discussion)
      .append($('<div>').append($commentInput).append($commentBtn));

    setReviewState($holder, review);

    reviewListener
      .onStateChange(function (review) {
	setReviewState($holder, review);
      })
      .onCommentsAdd(function (review, comments) {
	comments = _.filter(comments, { file:file, line:line });
	appendReviewComments($discussion, comments);
      });

    return $holder;
  }

  function showCommentTreeDialog(reviewId, file, line) {
    var review = getReviewById(reviewId);
    var $rSummary = findReviewSummaryElement(review);
    var title = 'Comments for ' + file + ':' + line;
    var reviewListener = new ReviewEvent($rSummary);

    var dialog = _dialogService.createDialog(title, {
      closeOnEscape: true,
      draggable: true,
      hide: 500,
      modal: true,
      show: 800,
      width: 600,
      height: 350,
    }, [
      {
	label: 'Close',
	handler: function() {
	  reviewListener.uninit();
	  dialog.close();
	}
      }
    ], function (dialog) {
      var $tree = renderCommentTree(review, file, line, reviewListener);

      $tree.appendTo(dialog.getDomElement());
    });

    reviewListener.onRemove(function (review) {
      dialog.close();
    });
  }

  function createDiffEditor(id, reviewId, repo, commit, file, type) {
    var sha1Abbrev = buildSha1Abbrev(commit.sha1);
    var contentType = { id: "diff/text" };
    var title = sha1Abbrev + ':' + file.path;
    var compare = {
      type: type || 'inline',
      files: [
	{
	  name: sha1Abbrev + '~' + ':' + file.path,
	  content: 'Fetching...',
	},
	{
	  name: sha1Abbrev + ':' + file.path,
	  content: 'Fetching...',
	}
      ]
    };
    var metaData = {
      compare: compare,
    };
    var contents = [
      (file.action === 'added') ? $.when('') :
        _gitService.showFile(repo, file.path, commit.sha1 + '~'),
      (file.action === 'removed') ? $.when('') :
	_gitService.showFile(repo, file.path, commit.sha1),
    ];
    var annotator = new CommentAnnotator();

    console.log('open editor', {id:id, type:contentType, data:'', title:title, metaData:metaData});
    var editor = _editorsService.createNewEditor(id, contentType, '', title, metaData);
    $.when.apply(this, contents)
      .then(function (oldContent, newContent) {
	var review = getReviewById(reviewId);
	var $rSummary = findReviewSummaryElement(review);

	editor.setContent([oldContent, newContent]);

	annotator.init(editor, function (line) {
	  showCommentTreeDialog(reviewId, file.path, line);
	});
	annotator.addComments(review.getComments(file.path));

	(new ReviewEvent($rSummary)).onCommentsAdd(function (review, comments) {
	  annotator.addComments(comments);
	});
      }, function (err) {
	console.error('failed to load', id, ':', err);
	editor.setContent([err, '']);
      });

    eventBus.vent.once("before:editorClosed", function (event) {
      if (event.editor === editor) {
	annotator.uninit();
      }
    });

    return editor;
  }

  function openDiffEditor(reviewId, repo, commit, file, type) {
    var id = type + '@' + commit.sha1 + ':' + file.path;

    if (_editorsService.getEditor(id)) {
      return _editorsService.setActiveEditor(id);
    }
    return createDiffEditor(id, reviewId, repo, commit, file, type);
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

  function onNodeDblClick(node) {
    var reviewId = node.data.reviewId;
    var review = getReviewById(reviewId);
    var repo = review.getRepository().id;
    var commit = node.data.commit;
    var file = node.data.file;

    console.log('git diff ' + commit.sha1 + '~ ' + commit.sha1 + ' ' + file.path);
    openDiffEditor(reviewId, repo, commit, file, 'twoWay');
  }

  function showCommitInfo(review, sha1) {
    var reviewId = review.getId();
    var repo = review.getRepository().id;
    var $filetree = $('<div>').attr('id', sha1 + '-file-tree');
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

  function appendReviewComments($discussion, comments) {
    for (var j = 0; j < comments.length; j++) {
      var comment = comments[j];

      $discussion.append(
	$('<li><b>' + buildUserName(comment.sender) + '</b>: ' +
	  comment.message + '</li>')
      );
    }
  }

  function showReviewDetails(review) {
    var $review = $('<div>').attr('id', buildReviewItemId(review) + '-details');
    var $commits = $('<div>');
    var $discussion = $('<ul></ul>').addClass('code-review-discussion');
    var $commentInput = $('<input type="text" name="review-comment"/>');
    var $commentBtn = $('<button type="button" name="review-comment">Respond</button>');

    $commentBtn.click(function () {
      var comment = $commentInput.val();
      _codeReviewService.commentReview(review, comment).done(function () {
	$commentInput.val('');
      });
    });
    $commentInput.keypress(function (event) {
      if (event.keyCode === 13) {
	event.preventDefault();
	$commentBtn.trigger("click");
      }
    });
    appendReviewComments($discussion, review.getComments());

    $commits.append(showCommitInfo(review, review.getBaseCommit().sha1));

    $review.append($('<div><label>Title: </label>' + review.getTitle() + '</div>'))
      .append($('<div><label>Author: </label>' + buildUserName(review.getAuthor()) + '</div>'))
      .append($('<div><label>Reviewer: </label>' + buildUserName(review.getReviewer()) + '</div>'))
      .append($('<div><label>Date: </label>' + review.getCreationDate() + '</div>'))
      .append($('<div><label>Description: </label><i>' + review.getDescription() + '</i></div>'))
      .append($('<div><label>Commits: </label></div>').append($commits))
      .append($('<div><label>Discussion: </label></div>').append($discussion))
      .append($('<div>').append($commentInput).append($commentBtn));

    if (review.isReviewer(_userService.getUserName())) {
      var $approvedBtn = $('<button type="button" name="review-approve">Approve</button>');
      var $rejectBtn = $('<button type="button" name="review-reject">Reject</button>');
      var $undoBtn = $('<button type="button" name="review-undo">Undo</button>');

      $approvedBtn.click(function () {
	_codeReviewService.changeReviewState(review, 'approved');
      });
      $rejectBtn.click(function () {
	_codeReviewService.changeReviewState(review, 'rejected');
      });
      $undoBtn.click(function () {
	_codeReviewService.changeReviewState(review, 'pending');
      });

      $('<div>')
	.append($approvedBtn)
	.append($rejectBtn)
	.append($undoBtn)
	.appendTo($review);
    }

    return $review;
  }

  function setReviewState($review, review) {
    if (review.isApproved()) {
      $review.addClass('code-review-approved');
    } else {
      $review.removeClass('code-review-approved');
    }

    if (review.isRejected()) {
      $review.addClass('code-review-rejected');
    } else {
      $review.removeClass('code-review-rejected');
    }

    /* Details tab is shown -- we need to update the state */
    if (review.isPending()) {
      $review.find('input[name="review-comment"]').prop('disabled', false).show();
      $review.find('button[name="review-comment"]').prop('disabled', false).show();
    } else {
      $review.find('input[name="review-comment"]').prop('disabled', true).hide();
      $review.find('button[name="review-comment"]').prop('disabled', true).hide();
    }
  }

  function openReviewSubPane($rSummary) {
    var review = $rSummary.data('review');
    var subPaneId = 'code-review-' + review.getId();
    var subPane = _layoutService.getSubPane(subPaneId);
    var reviewListener = new ReviewEvent($rSummary);

    if (!subPane) {
      subPane = _layoutService.createSubPane({
	pane: 'east',
	title: review.getTitle(),
	id: subPaneId,
	removable: true,
	render: function (subPane) {
	  var $rDetails = showReviewDetails(review);
	  setReviewState($rDetails, review);
	  $(subPane.getDomElement()).append($rDetails);
	},
      });
    }

    function onSubPaneSelected(event) {
      if (event.subPaneId === subPaneId) {
	$rSummary.removeClass('code-review-unread-comments');
      }
    }
    function onSubPaneRemoved(event) {
      if (event.subPaneId === subPaneId) {
	eventBus.vent.off('after:subPaneSelected', onSubPaneSelected);
	reviewListener.uninit();
      }
    }

    reviewListener
      .onStateChange(function (review) {
	var $rDetails = findReviewDetailsElement(review);

	setReviewState($rDetails, review);
      })
      .onCommentsAdd(function (review, comments) {
	var $rDetails = findReviewDetailsElement(review);
	var $discussion = $rDetails.find('ul.code-review-discussion');

	appendReviewComments($discussion, comments);
	if ($discussion.is(":visible")) {
	  $rSummary.removeClass('code-review-unread-comments');
	}
      })
      .onRemove(function (review) {
	eventBus.vent.off('after:subPaneSelected', onSubPaneSelected);
	eventBus.vent.off('before:subPaneRemoved', onSubPaneRemoved);
	_layoutService.removeSubPane(subPaneId);
      });

    eventBus.vent.on('after:subPaneSelected', onSubPaneSelected);
    eventBus.vent.once('before:subPaneRemoved', onSubPaneRemoved);

    subPane.select();
  }

  function addReviewItem(review) {
    var $rSummary = $('<div>').attr('id', buildReviewItemId(review))
      .addClass('code-review-preview');

    $rSummary.data('review', review);

    $rSummary
      .append(
	$('<div><label>Title:</label>' + review.getTitle() + '</div>')
	  .addClass('code-review-title'))
      .append(
	$('<div><label>Author:</label>' + buildUserName(review.getAuthor()) + '</div>')
	  .addClass('code-review-from'))
      .append(
	$('<div><label>Date:</label>' + review.getCreationDate() + '</div>')
	  .addClass('code-review-date')
      );

    $rSummary.click(function () {
      openReviewSubPane($rSummary);
    });

    setReviewState($rSummary, review);

    $reviewList.append($rSummary);
    $reviewListEmptyMessage.hide();

    (new ReviewEvent($rSummary))
      .onStateChange(function (review) {
	setReviewState($rSummary, review);
      })
      .onCommentsAdd(function (review, comments) {
	$rSummary.addClass('code-review-unread-comments');
      });
  }

  function updateReviewState(review) {
    var $rSummary = findReviewSummaryElement(review);

    $rSummary.data('review', review);
    $rSummary.trigger(ReviewEvent.events.STATE_CHANGED_EVENT, [review]);
  }

  function addReviewComments(review, comments) {
    var $rSummary = findReviewSummaryElement(review);

    $rSummary.data('review', review);
    $rSummary.trigger(ReviewEvent.events.ADD_COMMENTS_EVENT, [review, comments]);
  }

  function removeReviewItem(review) {
    var $review = findReviewSummaryElement(review);

    $review.trigger(ReviewEvent.events.REMOVE_EVENT, [review]);

    $review.remove();
    if (!$reviewList.children().length)
      $reviewListEmptyMessage.show();
  }

  function setReviews(reviews) {
    $reviewList.empty();
    for (var i = 0; i < reviews.length; i++) {
      addReviewItem(reviews[i]);
    }
    if (!$reviewList.children().length)
      $reviewListEmptyMessage.show();
  }

  function createReviewDialog(cPromise, rPromise) {
    var $title = $('<input type="text" />');
    var $commit = $('<select></select>');
    var $reviewer = $('<select></select>');
    var $description = $('<textarea cols="90" rows="5"></textarea>');
    var $error = $('<div><span class="create-review-error"></span></div>');

    function validate(dialog) {
      if (!$title.val() || !$reviewer.val() || !$commit.val()) {
	dialog.disableButton('OK');
	return false;
      }
      dialog.enableButton('OK');
      return true;
    }
    function dialogOKHandler() {
      if (!validate(dialog)) return;

      $.when(cPromise, rPromise).done(function (commits, reviewers) {
	var title = $title.val();
	var desc = $description.val();
	var commit = commits[parseInt($commit.val())];
	var reviewer = reviewers[parseInt($reviewer.val())];
	var repo = getProjectRepo(_projectsService.getActiveProject());

	$error.hide();
	_codeReviewService.createNewReviewRequest(repo, title, desc, reviewer, commit)
	  .fail(function (err) { $error.text(JSON.stringify(err)).show(); })
	  .done(function () { dialog.close(); });
      });
    }
    function renderDialog(dialog) {
      $(dialog.getDomElement())
	.append($('<div>Title:</div>').append($title))
	.append($('<div>Reviewer:</div>').append($reviewer))
	.append($('<div>Commit:</div>').append($commit))
	.append($('<div>Description:</div>').append('<br/>')
	.append($description))
	.append($error);
//       validate(dialog);
    };

    $commit.prop("disabled", true);
    $commit.append('<option disabled>Loading commits...</option>');
    cPromise
      .always(function () {
	console.log('  ### commit always');
	$commit.empty();
      })
      .done(function (commits) {
	console.log('  ### commit done');
	$commit.prop("disabled", false);
	$commit.append('<option disabled>Select commit</option>');
	for (var i = 0; i < commits.length; i++) {
	  var commit = commits[i];

	  $commit.append('<option value="' + i + '">' +
	      buildCommitName(commit, 80) + '</option>');
	}
      })
      .fail(function (err) {
	console.log('  ### commit fail:', err);
	$commit.append('<option disabled>Failed to load commits!</option>');
      });

    $reviewer.prop("disabled", true);
    $reviewer.append('<option disabled>Loading reviewers...</option>');
    rPromise
      .always(function () {
	console.log('  ### reviewer always');
	$reviewer.empty();
      })
      .done(function (reviewers) {
	console.log('  ### reviewer done');
	$reviewer.prop("disabled", false);
	$reviewer.append('<option disabled>Select reviewer</option>');
	for (var i = 0; i < reviewers.length; i++) {
	  var reviewer = reviewers[i];
	  var message = buildUserName(reviewer);

	  $reviewer.append('<option value="' + i + '">' + message + '</option>');
	}
      })
      .fail(function (err) {
	console.log('  ### reviewer fail:', err);
	$reviewer.append('<option disabled>Failed to load reviewers!</option>');
      });

    var dialog = _dialogService.createDialog('Create pull request', {
      closeOnEscape: true,
      draggable: true,
      hide: 500,
      modal: true,
      show: 800,
      width: 600,
      height: 350,
    }, [
      {
	label: 'OK',
	title: 'OK',
	handler: dialogOKHandler,
      },
      {
	label: 'Cancel',
	handler: function() { dialog.close(); }
      }
    ], renderDialog);

    $title.change(function () { validate(dialog); });
    $commit.change(function () { validate(dialog); });
    $reviewer.change(function () { validate(dialog); });

    return dialog;
  }

  function getProjectCommitList() {
    var project = _projectsService.getActiveProject();

    if (!project) {
      return (new $.Deferred()).reject('no active project').promise();
    }

    return _gitService.log(getProjectRepo(project).id);
  }

  function subPaneRender(subPane) {
    var $panel = $(subPane.getDomElement());

    $holder = $('<div id="code-review-holder"/>')
      .appendTo($panel);

    var $create = $('<div id="code-review-create"/>');
    var $sendButton = $('<button type="button">Send Pull Request</button>');
    $sendButton.click(function () {
      createReviewDialog(getProjectCommitList(),
	_codeReviewService.getReviewers());
    });
    $create.append($sendButton).appendTo($holder);

    $incoming = $('<div id="code-review-incoming"/>').appendTo($holder);
    $reviewList = $('<div class="code-review-list"></div>').appendTo($incoming);
    $reviewListEmptyMessage = $('<p>No pending reviews</div>').appendTo($incoming);
  }

  function configModule(layoutServiceProvider) {
    layoutServiceProvider.registerSubPane({
      pane: 'east',
      title: 'Pull Request',
      id: 'code-review',
      order: 100,
      render: function () { return subPaneRender; }
    });

    CommentAnnotator.registerAnnotationType();
  }

  function runModule(codeReviewService, dialogService, editorsService,
    layoutService, gitService, projectsService, userService)
  {
    _codeReviewService = codeReviewService;
    _dialogService = dialogService;
    _editorsService = editorsService;
    _layoutService = layoutService;
    _gitService = gitService;
    _projectsService = projectsService;
    _userService = userService;

    eventBus.vent.on('code-review:add', addReviewItem);
    eventBus.vent.on('code-review:rem', removeReviewItem);
    eventBus.vent.on('code-review:comments-add', addReviewComments);
    eventBus.vent.on('code-review:state-change', updateReviewState);

    _codeReviewService.getPendingReviews().then(function (res) {
      setReviews(res);
    });
  }

  return {
    config : [
      'ide-layoutServiceProvider',
      configModule
    ],
    run : [
      'code-review-service',
      'dialog-service',
      'editors-service',
      'ide-layoutService',
      'git-service',
      'projects-service',
      'user-service',
      runModule
    ],
  };
});
