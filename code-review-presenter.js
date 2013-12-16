define([
  'scripts/core/event-bus',
  './code-review-service',
  'css!./css/code-review.css',
], function (eventBus, reviewService) {
  'use strict';

  var _dialogService;
  var $holder, $incoming, $reviewList, $reviewListEmptyMessage;
  var reviewItemMap = {};

  function buildUserName(r) {
    return r.fullName + ' &lt' + r.email + '&gt';
  }
  function buildCommitName(c, maxLen) {
    var message = c.sha1.substr(0, 7) + ' ' + c.message;
    if (message.length > maxLen) message = message.substr(0, maxLen-3) + '...';
    return message;
  }
  function buildReviewItemId(r) {
    return 'code-review-item-' + r._id;
  }

  function appendReviewItem(r) {
    var $r = $('<div id="' + buildReviewItemId(r) + '"></div>');
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

    $r.append($('<div>' + r.title + '</label>'))
      .append($('<div>' + buildUserName(from) + '</label>'))
      .append($('<div>' + buildCommitName(r.commit, 40) + '</label>'))
      .append($('<div><i>' + r.description + '</i></label>'))
      .append($('<div>' + r.date + '</label>'))
      .append($discussion)
      .append($('<div></div>').append($cmnt))
      .append($('<div></div>').append($btn))
      .appendTo($reviewList);
    $reviewListEmptyMessage.hide();

    return $r;
  }

  function removeReviewItem(r) {
    var $r = $('#' + buildReviewItemId(r));

    if (!$r.length) return;

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
    $commit.append('<option disabled>Loading commiters...</option>');
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

  function run(dialogService) {
    _dialogService = dialogService;

    eventBus.vent.on('code-review:add', appendReviewItem);
    eventBus.vent.on('code-review:rem', removeReviewItem);
  }

  return {
    config: config,
    run: run,
  }
});
