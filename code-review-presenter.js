define([
  'css!./css/code-review.css',
], function () {
  'use strict';

  var $holder, $reviewerSelect, $incoming;

  function setReviewers(reviewerList) {
    $reviewerSelect.empty();
    $reviewerSelect.append('<option disabled>Select reviewer</option>');
    for (var i = 0; i < reviewerList.length; i++) {
      var reviewer = reviewerList[i];
      var optionString;
      
      optionString = '<option';
      if (reviewer.id) optionString += ' value="' + reviewer.id + '"';
      optionString += '>' + reviewer.name + '</option>';

      $reviewerSelect.append($(optionString));
    }
  }

  function render(subPane) {
    var panel = $(subPane.getDomElement());

    $holder = $('<div id="code-review-holder"/>')
      .appendTo(panel);

    var $create = $('<div id="code-review-create"/>');
    $reviewerSelect = $('<select>');
    setReviewers([]);
    var $sendButton = $('<button type="button">Send Pull Request</button>');
    $sendButton.click(function () {
      var reviewer = $reviewerSelect.val();
      if (reviewer) console.log(' ******** reviewer: ' + reviewer);
    });
    $create.append($reviewerSelect).append($sendButton).appendTo($holder);

    $incoming = $('<div id="code-review-incoming"/>')
      .append($('<p>No pending pull requests</p>'))
      .appendTo($holder);
  }

  function init(layoutService) {
    layoutService.registerSubPane({
      pane: 'east',
      title: 'Code Review',
      id: 'code-review',
      order: 100,
      render: function () { return render; }
    });
  }

  return {
    init: init,
  }
});
