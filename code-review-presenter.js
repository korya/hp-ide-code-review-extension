define([
  'scripts/core/event-bus',
  './code-review-service',
  'css!./css/code-review.css',
], function (eventBus, reviewService) {
  'use strict';

  var _dialogService;
  var $holder, $incoming;

  function buildUserName(r) {
    return r.fullName + ' &lt' + r.email + '&gt';
  }
  function buildCommitName(c, maxLen) {
    var message = c.sha.substr(0, 7) + ' ' + c.title;
    if (message.length > maxLen) message = message.substr(0, maxLen-3) + '...';
    return message;
  }

  function setReviews(reviews) {
    var $list = $('<div class="code-review-list"></div>');

    for (var i = 0; i < reviews.length; i++) {
      var r = reviews[i];
      var $r = $('<div class="code-review-item"></div>');
      var $discussion = $('<ul></ul>');
      var $cmnt = $('<input type="text" name="review-comment"/>');
      var $btn = $('<button type="button">Respond</button>');
      var from = r.pending === 'reviewer' ? r.author : r.reviewer;

      $btn.click(function () {
	var comment = $cmnt.val();
	console.log('response:', comment);
  	reviewService.respondToReview(r, comment);
      });

      for (var j = 0; j < r.comments.length; j++) {
	var c = r.comments[j];
	$discussion.append($('<li><b>' + buildUserName(c.author) + '</b>: ' +
	  c.message + '</li>'));
      }

      $r.append($('<div>' + r.title + '</label>'))
        .append($('<div>' + buildUserName(from) + '</label>'))
        .append($('<div>' + buildCommitName(r.commit, 40) + '</label>'))
	.append($('<div>' + r.date + '</label>'))
	.append($discussion)
	.append($('<div></div>').append($cmnt))
	.append($('<div></div>').append($btn))
	.appendTo($list);
    }
    $incoming.empty();
    $list.append($('<li><p>No more pending pull requests</p></li>'));
    $incoming.append($list);
  }

  function createReviewDialog(commits, reviewers) {
    var $title = $('<input type="text" />');
    var $commit = $('<select></select>');
    var $reviewer = $('<select></select>');
    var $description = $('<textarea cols="90" rows="5"></textarea>');
    var $error = $('<div><span class="create-review-error"></span></div>');

    function addCommits(commits) {
      $commit.empty();
      $commit.append('<option disabled>Select commit</option>');
      for (var i = 0; i < commits.length; i++) {
	var commit = commits[i];

	$commit.append('<option value="' + i + '">' +
	    buildCommitName(commit, 80) + '</option>');
      }
    }
    function addReviewers(reviewers) {
      $reviewer.empty();
      $reviewer.append('<option disabled>Select reviewer</option>');
      for (var i = 0; i < reviewers.length; i++) {
	var reviewer = reviewers[i];
	var message = buildUserName(reviewer);

	$reviewer.append('<option value="' + i + '">' + message + '</option>');
      }
    }
    function validate(dialog) {
      var index;
      if (!$title.val() || !$reviewer.val() || !$commit.val() ||
	  (index = parseInt($reviewer.val())) < 0 || index >= reviewers.length ||
	  (index = parseInt($commit.val())) < 0 || index >= commits.length)
      {
	dialog.disableButton('OK');
	return false;
      }
      dialog.enableButton('OK');
      return true;
    }

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
	handler: function() {
	  if (!validate(dialog)) return;
	  var title = $title.val();
	  var desc = $description.val();
	  var commit = commits[parseInt($commit.val())];
	  var review = reviewers[parseInt($reviewer.val())];

	  $error.hide();
	  reviewService.sendReviewRequest(title, desc, review, commit)
            .fail(function (err) { $error.text(JSON.stringify(err)).show(); })
            .done(function () { dialog.close(); });
	}
      },
      {
	label: 'Cancel',
	handler: function() { dialog.close(); }
      }
    ], function (dialog) {
      var $dialog = $(dialog.getDomElement());

      addCommits(commits);
      addReviewers(reviewers);
      $dialog
	.append($('<div>Title:</div>').append($title))
	.append($('<div>Reviewer:</div>').append($reviewer))
	.append($('<div>Commit:</div>').append($commit))
	.append($('<div>Description:</div>').append('<br/>')
	  .append($description))
	.append($error);
//       validate(dialog);
    });

    $title.change(function () { validate(dialog); });
    $commit.change(function () { validate(dialog); });
    $reviewer.change(function () { validate(dialog); });

    return dialog;
  }

  function render(subPane) {
    var $panel = $(subPane.getDomElement());

    $holder = $('<div id="code-review-holder"/>')
      .appendTo($panel);

    var $create = $('<div id="code-review-create"/>');
    var $sendButton = $('<button type="button">Send Pull Request</button>');
    $sendButton.click(function () {
      var commits = [
	{ sha: '6f2851f8fe057fad01a568a3503d396e591b5c75', title: 'C' },
        { sha: 'fff6dc6f9cd9ac1a4ce0ff8c60bd2b8d452a99a7', title: 'D' },
        { sha: '5bcd5501c916c0067d01a5ad3f68ce62e56519aa', title: 'E' },
      ];
      createReviewDialog(commits, reviewService.getReviewers());
    });
    $create.append($sendButton).appendTo($holder);

    $incoming = $('<div id="code-review-incoming"/>').appendTo($holder);
    setReviews([]);
  }

  function config(layoutServiceProvider) {
    layoutServiceProvider.registerSubPane({
      pane: 'east',
      title: 'Pull Request',
      id: 'code-review',
      order: 100,
      render: function () { return render; }
    });
  }

  function run(dialogService) {
    _dialogService = dialogService;

    var pending = {
      reviews: [],
      responses: [],
      all: [],
    };
    eventBus.vent.on('code-review:review-requests', function () {
      pending.reviews = reviewService.getPendingReviewRequests();
      pending.all = pending.reviews.concat(pending.responses);
      setReviews(pending.all);
    });
    eventBus.vent.on('code-review:response-requests', function () {
      pending.responses = reviewService.getPendingResponseRequests();
      pending.all = pending.reviews.concat(pending.responses);
      setReviews(pending.all);
    });
  }

  return {
    config: config,
    run: run,
  }
});
