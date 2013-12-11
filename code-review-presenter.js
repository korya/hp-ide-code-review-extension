define([
  'css!./css/code-review.css',
], function () {
  'use strict';

  var _dialogService;
  var $holder, $incoming;

  function createReviewDialog(commits, reviewers) {
    var $title = $('<input type="text" />');
    var $commit = $('<select></select>');
    var $reviewer = $('<select></select>');
    var $description = $('<textarea cols="90" rows="5"></textarea>');

    function addCommits(commits) {
      $commit.empty();
      $commit.append('<option disabled>Select commit</option>');
      for (var i = 0; i < commits.length; i++) {
	var commit = commits[i];
	var message = commit.sha.substr(0, 7) + ' ' + commit.title;

	if (message.length > 80) message = message.substr(0, 77) + '...';
	$commit.append('<option value="' + i + '">' + message + '</option>');
      }
    }
    function addReviewers(reviewers) {
      $reviewer.empty();
      $reviewer.append('<option disabled>Select reviewer</option>');
      for (var i = 0; i < reviewers.length; i++) {
	var reviewer = reviewers[i];
	var message = reviewer.name + ' &lt' + reviewer.mail + '&gt';

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
    function assembleReview() {
      return {
	reviewer: reviewers[parseInt($reviewer.val())],
	title: $title.val(),
	description: $description.val(),
	commit: commits[parseInt($commit.val())],
      };
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
	  var review = assembleReview();
	  console.log('New review:', review);
	  dialog.close();
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
	  .append($description));
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
      var reviewers = [
        { name: 'liron', mail: 'liron@hp' },
        { name: 'denis', mail: 'denis@t2' },
        { name: 'dima', mail: 'dima@t2' },
      ];
      createReviewDialog(commits, reviewers);
    });
    $create.append($sendButton).appendTo($holder);

    $incoming = $('<div id="code-review-incoming"/>')
      .append($('<p>No pending pull requests</p>'))
      .appendTo($holder);
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
  }

  return {
    config: config,
    run: run,
  }
});
