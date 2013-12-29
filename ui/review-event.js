define([
], function () {

  var events = {
    ADD_COMMENTS_EVENT: 'review-add-comments',
    STATE_CHANGED_EVENT: 'review-state-changed',
    REMOVE_EVENT: 'review-remove',
  };

  function ReviewEvent($review) {
    this._$review = $review;
    this._init();
  }

  ReviewEvent.events = events;

  ReviewEvent.prototype = {
    _init: function () {
      this._queues = {};
      this._cbs = {};
      _.forOwn(ReviewEvent.events, function (e) {
	this._queues[e] = [];
	this._cbs[e] = _.bind(this._onEvent, this, e);
	this._$review.on(e, this._cbs[e]);
	console.error(' +++', {e:e, q:this._queues[e], cb:this._cbs[e]});
      }, this);
    },
    uninit: function () {
      _.forOwn(ReviewEvent.events, function (e) {
	this._$review.off(e, this._cbs[e]);
      }, this);
      delete this._cbs;
      delete this._queues;
    },
    _onEvent: function () {
      /* Ignore 2 first arguments
       *   argument[0] = event name
       *   argument[1] = jquery event object
       */
      var e = arguments[0];
      var args = Array.prototype.slice.call(arguments, 2);
      this._queues[e].forEach(function (cb) {
	cb.apply(null, args);
      });
      if (e === ReviewEvent.events.REMOVE_EVENT) {
	this.uninit();
      }
    },
    onCommentsAdd: function (callback) {
      this._queues[ReviewEvent.events.ADD_COMMENTS_EVENT].push(callback);
      return this;
    },
    onStateChange: function (callback) {
      this._queues[ReviewEvent.events.STATE_CHANGED_EVENT].push(callback);
      return this;
    },
    onRemove: function (callback) {
      this._queues[ReviewEvent.events.REMOVE_EVENT].push(callback);
      return this;
    },
  };

  return ReviewEvent;
})
