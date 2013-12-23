define([
  'scripts/core/event-bus',
  './code-review-service',
  /* Assume dynatree was already loaded by project-tree */
  'css!./css/code-review.css',
], function (eventBus, reviewService) {
  'use strict';

  var _dialogService, _editorsService, _layoutService;
  var $holder, $incoming, $reviewList, $reviewListEmptyMessage;
  var reviewItemMap = {};

  function buildUserName(r) {
    return r.fullName + ' &lt' + r.email + '&gt';
  }
  function buildSha1Abbrev(sha1) {
    return sha1.substr(0, 7); // Just truncate it
  }
  function buildCommitName(c, maxLen) {
    var message = buildSha1Abbrev(c.sha1) + ' "' + c.message + '"';
    if (message.length > maxLen) message = message.substr(0, maxLen-3) + '...';
    return message;
  }
  function buildReviewItemId(r) {
    return 'code-review-item-' + r._id;
  }

  function createDiffEditor(id, repo, commit, file, type) {
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
      (file.action === 'added') ? $.when('') : reviewService.getFileRevision(repo, file.path, commit.sha1 + '~'),
      (file.action === 'removed') ? $.when('') : reviewService.getFileRevision(repo, file.path, commit.sha1),
    ];

    console.log('open editor', {id:id, type:contentType, data:'', title:title, metaData:metaData});
    var editor = _editorsService.createNewEditor(id, contentType, '', title, metaData);
    $.when.apply(this, contents)
      .then(function (oldContent, newContent) {
	editor.setContent([oldContent, newContent]);
      }, function (err) {
	console.error('failed to load', id, ':', err);
	editor.setContent([err, '']);
      });
  }

  function openDiffEditor(repo, commit, file, type) {
    var id = type + '@' + commit.sha1 + ':' + file.path;

    if (_editorsService.getEditor(id)) {
      return _editorsService.setActiveEditor(id);
    }
    return createDiffEditor(id, repo, commit, file, type);
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

  function addFileToTree(repo, commit, file, tree) {
    var splitpath = file.path.replace(/^\/|\/$/g, '').split('/');
    var i;

    for (i = 0; i < splitpath.length - 1; i++)
    {
      tree = tree.addChild({
	title: splitpath[i],
	isFolder: true,
      });
    }

    tree.addChild({
      title: splitpath[i],
      key: file.path,
      tooltip: getFileTooltip(file),
      addClass: getFileTypeClass(name) + '-icon ' + getActionClass(file.action),
      repo: repo,
      commit: commit,
      file: file,
    });
  }

  function onNodeDblClick(node) {
    var repo = node.data.repo;
    var commit = node.data.commit;
    var file = node.data.file;

    console.log('git diff ' + commit.sha1 + '~ ' + commit.sha1 + ' ' + file.path);
    openDiffEditor(repo, commit, file, 'twoWay');
  }

  function showCommitInfo(r, sha1) {
    var repo = r.repo;
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
    reviewService.getCommitDetails(repo, sha1).then(function (commit) {
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
	addFileToTree(repo, commit, commit.files[i], treeRoot);
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
	$('<li><b>' + buildUserName(comment.author) + '</b>: ' +
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
      reviewService.respondToReview(review, comment).done(function () {
	$commentInput.val('');
      });
    });
    $commentInput.keypress(function (event) {
      if (event.keyCode === 13) {
	event.preventDefault();
	$commentBtn.trigger("click");
      }
    });
    if (!review.comments) review.comments = [];
    appendReviewComments($discussion, review.comments);

    $commits.append(showCommitInfo(review, review.commit.sha1));

    $review.append($('<div><label>Title: </label>' + review.title + '</div>'))
      .append($('<div><label>Author: </label>' + buildUserName(review.author) + '</div>'))
      .append($('<div><label>Reviewer: </label>' + buildUserName(review.reviewer) + '</div>'))
      .append($('<div><label>Date: </label>' + review.date + '</div>'))
      .append($('<div><label>Description: </label><i>' + review.description + '</i></div>'))
      .append($('<div><label>Commits: </label></div>').append($commits))
      .append($('<div><label>Discussion: </label></div>').append($discussion))
      .append($('<div>').append($commentInput).append($commentBtn));

    if (review.reviewer.email === reviewService.getMySelf().email) {
      var $approvedBtn = $('<button type="button" name="review-approve">Approve</button>');
      var $rejectBtn = $('<button type="button" name="review-reject">Reject</button>');
      var $undoBtn = $('<button type="button" name="review-undo">Undo</button>');

      $approvedBtn.click(function () {
	reviewService.changeReviewState(review, 'approved');
      });
      $rejectBtn.click(function () {
	reviewService.changeReviewState(review, 'rejected');
      });
      $undoBtn.click(function () {
	reviewService.changeReviewState(review, 'pending');
      });

      $('<div>')
	.append($approvedBtn)
	.append($rejectBtn)
	.append($undoBtn)
	.appendTo($review);
    }

    return $review;
  }

  function addReviewComments(review, comments) {
    var $rSummary = $('#' + buildReviewItemId(review));
    var $rDetails = $('#' + buildReviewItemId(review) + '-details');

    if ($rDetails.length) {
      /* Details tab is shown -- we need to append the comments */
      var $discussion = $rDetails.find('ul.code-review-discussion');

      appendReviewComments($discussion, comments);
    } else {
      /* Details tab is not shown -- notify the user about new comments */
      $rSummary.addClass('code-review-unread-comments');
    }

    if (!$rSummary.length) {
      /* XXX Draw the review? */
      console.error('got comments for non-existing review:',
	{review:review, comments:comments});
      return;
    }

    $rSummary.data('review', review);
  }

  function setReviewState($rSummary, $rDetails, review) {
    if (review.state === 'approved') {
      $rSummary.addClass('code-review-approved');
      $rDetails.addClass('code-review-approved');
    } else {
      $rSummary.removeClass('code-review-approved');
      $rDetails.removeClass('code-review-approved');
    }

    if (review.state === 'rejected') {
      $rSummary.addClass('code-review-rejected');
      $rDetails.addClass('code-review-rejected');
    } else {
      $rSummary.removeClass('code-review-rejected');
      $rDetails.removeClass('code-review-rejected');
    }

    if ($rDetails.length) {
      /* Details tab is shown -- we need to update the state */
      if (review.state === 'pending') {
	$rDetails.find('input[name="review-comment"]').prop('disabled', false).show();
	$rDetails.find('button[name="review-comment"]').prop('disabled', false).show();
      } else {
	$rDetails.find('input[name="review-comment"]').prop('disabled', true).hide();
	$rDetails.find('button[name="review-comment"]').prop('disabled', true).hide();
      }
    }
  }

  function addReviewItem(r) {
    var $rSummary = $('<div>').attr('id', buildReviewItemId(r))
      .addClass('code-review-preview');

    $rSummary.data('review', r);

    $rSummary
      .append($('<div><label>Title:</label>' + r.title + '</div>').addClass('code-review-title'))
      .append($('<div><label>Author:</label>' + buildUserName(r.author) + '</div>').addClass('code-review-from'))
      .append($('<div><label>Date:</label>' + r.date + '</div>').addClass('code-review-date'));

    $rSummary.click(function () {
      var review = $rSummary.data('review');
      $rSummary.removeClass('code-review-unread-comments');
      var subPane = _layoutService.createSubPane({
	pane: 'east',
	title: review.title,
	id: 'code-review-' + review._id,
	removable: true,
	render: function (subPane) {
	  var $rDetails = showReviewDetails(review);
	  setReviewState($(''), $rDetails, review);
	  $(subPane.getDomElement()).append($rDetails);
	},
      });
      subPane.select();
    });

    setReviewState($rSummary, $(''), r);

    $reviewList.append($rSummary);
    $reviewListEmptyMessage.hide();
  }

  function updateReviewState(review) {
    var $rSummary = $('#' + buildReviewItemId(review));
    var $rDetails = $('#' + buildReviewItemId(review) + '-details');

    setReviewState($rSummary, $rDetails, review);

    $rSummary.data('review', review);
  }

  function removeReviewItem(r) {
    var $r = $('#' + buildReviewItemId(r));

    if (!$r.length) return;

    _layoutService.removeSubPane('code-review-' + r._id);
    $r.remove();
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

	$error.hide();
	reviewService.sendReviewRequest(title, desc, reviewer, commit)
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

  function subPaneRender(subPane) {
    var $panel = $(subPane.getDomElement());

    $holder = $('<div id="code-review-holder"/>')
      .appendTo($panel);

    var $create = $('<div id="code-review-create"/>');
    var $sendButton = $('<button type="button">Send Pull Request</button>');
    $sendButton.click(function () {
      createReviewDialog(reviewService.getCommitList(), reviewService.getReviewers());
    });
    $create.append($sendButton).appendTo($holder);

    $incoming = $('<div id="code-review-incoming"/>').appendTo($holder);
    $reviewList = $('<div class="code-review-list"></div>').appendTo($incoming);
    $reviewListEmptyMessage = $('<p>No pending reviews</div>').appendTo($incoming);

    reviewService.getPendingReviews().then(function (res) {
      setReviews(res);
    });
  }

  function config(layoutServiceProvider) {
    layoutServiceProvider.registerSubPane({
      pane: 'east',
      title: 'Pull Request',
      id: 'code-review',
      order: 100,
      render: function () { return subPaneRender; }
    });
  }

  function run(dialogService, editorsService, layoutService) {
    _dialogService = dialogService;
    _editorsService = editorsService;
    _layoutService = layoutService;

    eventBus.vent.on('code-review:add', addReviewItem);
    eventBus.vent.on('code-review:rem', removeReviewItem);
    eventBus.vent.on('code-review:comments-add', addReviewComments);
    eventBus.vent.on('code-review:state-change', updateReviewState);
  }

  return {
    config: config,
    run: run,
  }
});
