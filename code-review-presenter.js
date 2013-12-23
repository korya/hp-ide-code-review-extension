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
    });

    return $filetree;
  }

  function appendReviewItem(r) {
    var $r = $('<div id="' + buildReviewItemId(r) + '"></div>');
    var $commits = $('<div><label>Commits:</label></div>');
    var $discussion = $('<ul></ul>');
    var $cmnt = $('<input type="text" name="review-comment"/>');
    var $btn = $('<button type="button">Respond</button>');
    var from = r.pending === 'reviewer' ? r.author : r.reviewer;

    $btn.click(function () {
      var comment = $cmnt.val();
      reviewService.respondToReview(r, comment);
    });
    $cmnt.keypress(function (event) {
      if (event.keyCode === 13) {
	event.preventDefault();
	$btn.trigger("click");
      }
    });

    if (!r.comments) r.comments = [];
    for (var j = 0; j < r.comments.length; j++) {
      var c = r.comments[j];
      $discussion.append($('<li><b>' + buildUserName(c.author) + '</b>: ' +
	    c.message + '</li>'));
    }

    $commits.append(showCommitInfo(r, r.commit.sha1));

    $r.append($('<div>Title: ' + r.title + '</div>'))
      .append($('<div>From: ' + buildUserName(from) + '</div>'))
      .append($commits)
      .append($('<div>Description: <i>' + r.description + '</i></div>'))
      .append($('<div>Date: ' + r.date + '</div>'))
      .append($discussion)
      .append($('<div></div>').append($cmnt))
      .append($('<div></div>').append($btn));

    var $rPreview = $('<div>').attr('id', 'preview-' + buildReviewItemId(r))
      .addClass('code-review-preview');

    $rPreview
      .append($('<div>Title:' + r.title + '</div>').addClass('code-review-title'))
      .append($('<div>From: ' + buildUserName(from) + '</div>').addClass('code-review-from'))
      .append($('<div>Date: ' + r.date + '</div>').addClass('code-review-date'))
      .appendTo($reviewList);
    $reviewListEmptyMessage.hide();

    $rPreview.click(function () {
      var subPane = _layoutService.createSubPane({
	pane: 'east',
	title: r.title,
	id: 'code-review-' + r._id,
	removable: true,
	render: function (subPane) {
	  $(subPane.getDomElement()).append($r);
	}
      });
      subPane.select();
    });

    return $r;
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
      appendReviewItem(reviews[i]);
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

    eventBus.vent.on('code-review:add', appendReviewItem);
    eventBus.vent.on('code-review:rem', removeReviewItem);
  }

  return {
    config: config,
    run: run,
  }
});
