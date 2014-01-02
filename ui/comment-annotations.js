define([
  'orion/editor/annotations',
  'orion/compare/compareRulers',
], function(mAnnotations, mCompareRulers) {
  'use strict';

  var ANNOTATION_COMMENT = 'code-review.annotation.comment';

  function addRulerOnClickHandler(ruler, newHandler) {
    var oldHandler = ruler.onClick;

    ruler.onClick = function (lineIndex, e) {
      if (oldHandler !== undefined) oldHandler.call(ruler, lineIndex, e);
      newHandler.call(ruler, lineIndex, e);
    }
  }

  function registerAnnotationType() {
    var styleClass = 'comment';
    var properties = {
      title: 'Code review comment annotation',
      style: {
	styleClass: "annotation " + styleClass,
      },
//       html: "<div class='annotationHTML " + styleClass + "'></div>",
      overviewStyle: {
	styleClass: "annotationOverview " + styleClass,
      },
      lineStyle: {
	styleClass: "annotationLine " + styleClass,
      },
    };

    mAnnotations.AnnotationType.registerType(ANNOTATION_COMMENT, properties);
  }

  function CompareViewWrapper(compareView) {
    this._view = compareView;
  }
  CompareViewWrapper.prototype = {
    getEditor: function () {
      return this._editor;
    },
    getAnnotationStyler: function () {
      return this._annotationStyler;
    },
    getAnnotationRuler: function () {
      return this._annotationRuler;
    },
    getLineNumberRuler: function () {
      return this._lineNumberRuler;
    },
  };

  function TwoWayViewWrapper(compareView) {
    CompareViewWrapper.call(this, compareView);
    /* twoWay compare widget -- there are 2 editors:
     *
     *  +-+---------------+----------------+-+
     *  +A| new file      | old file       |O|
     *  +A|      contents |       contents |O|
     *  +A| _editors[1]   | _editors[0]    |O|
     *  +-+---------------+----------------+-+
     *
     *   - we use annotation ruler and annotation styler of editor 1
     *   - we use overview ruler of editor 0 //XXX
     */
    this._editor = this._view._editors[1];
    this._annotationStyler = this._editor.getAnnotationStyler();
    this._annotationRuler = this._editor.getAnnotationRuler();
    this._lineNumberRuler = _.find(this._editor.getTextView().getRulers(), function (r) {
      return r instanceof mCompareRulers.LineNumberCompareRuler;
    });
  }
  TwoWayViewWrapper.prototype = new CompareViewWrapper();

  function InlineViewWrapper(compareView) {
    CompareViewWrapper.call(this, compareView);
    /* inline compare widget -- there is only one editor, but
     *   - it has 2 line number rulers //XXX
     *   - it has an annotation ruler, but it's unvisible by default
     */
    this._editor = compareView._editor;
    this._annotationStyler = this._editor.getAnnotationStyler();
    this._annotationRuler = this._editor.getAnnotationRuler();
    /* XXX Need to distinguish old and new line number rulers:
     *  compareView._rulerOrigin vs. compareView._rulerNew
     */
    this._lineNumberRuler = this._view._rulerNew;
  }
  InlineViewWrapper.prototype = new CompareViewWrapper();

  function CompareViewWrapperFactory(compareView) {
    if (compareView.hasOwnProperty('_editors'))
      return new TwoWayViewWrapper(compareView);
    if (compareView.hasOwnProperty('_editor'))
      return new InlineViewWrapper(compareView);

    console.error('Failed to add comment annotation to compare editor:',
      compareView);
  }

  function CommentAnnotator() {
  }
  CommentAnnotator.prototype = {
    init: function (compareEditor, onClickHandler) {
      var wrapper = CompareViewWrapperFactory(compareEditor.getCompareView());
      var editor = wrapper.getEditor();
      var annotationRuler = wrapper.getAnnotationRuler();
      var annotationStyler = wrapper.getAnnotationStyler();
      var lineNumberRuler = wrapper.getLineNumberRuler();

      this._wrapper = wrapper;
      this._onClickHandler = onClickHandler;

      if (annotationStyler) {
	annotationStyler.addAnnotationType(ANNOTATION_COMMENT);
      }

      if (annotationRuler) {
	annotationRuler.addAnnotationType(ANNOTATION_COMMENT);
	this._addOnClickHandler(annotationRuler);
	editor.setAnnotationRulerVisible(true);
      }

      if (lineNumberRuler) {
	this._addOnClickHandler(lineNumberRuler);
      }

      this._comments = [];
      this._onInputChanged = _.bind(function (event) {
	var comments = this._comments;
	console.error('   ### Input changed', {event:event, comments:comments});
	this._updateAnnotations(comments);
      }, this);
      editor.addEventListener("InputChanged", this._onInputChanged);
    },

    uninit: function () {
      this.clean();
      this._wrapper.getEditor().removeEventListener("InputChanged",
	this._onInputChanged);
    },
    
    addComments: function (comments) {
      this._comments = this._comments.concat(comments);
      this._updateAnnotations(this._comments);
    },

    setComments: function (comments) {
      this._comments = comments.slice();
      this._updateAnnotations(this._comments);
    },

    clean: function (comments) {
      var ruler = this._wrapper.getAnnotationRuler();
      var annotationModel = ruler.getAnnotationModel();

      annotationModel.removeAnnotations(ANNOTATION_COMMENT);
    },

    _updateAnnotations: function (comments) {
      var ruler = this._wrapper.getAnnotationRuler();
      var annotationModel = ruler.getAnnotationModel();
      var add = [], remove = [];

      _.chain(comments)
	.groupBy('line')
	.forEach(function (comments, line) {
	  var lineIndex = parseInt(line) - 1;
	  var annotation = this._getAnnotation(lineIndex);
	  if (annotation) remove.push(annotation);
	  add.push(this._createAnnotation(lineIndex, comments));
	}, this);

      annotationModel.replaceAnnotations(remove, add);
    },

    _getAnnotation: function (lineIndex) {
      var ruler = this._wrapper.getAnnotationRuler();
      var view = ruler.getView();
      var viewModel = view.getModel();
      var annotationModel = ruler.getAnnotationModel();
      var start = viewModel.getLineStart(lineIndex);
      var end = viewModel.getLineEnd(lineIndex, true);
      var annotations = annotationModel.getAnnotations(start, end);

      while (annotations.hasNext()) {
	var annotation = annotations.next();
	if (annotation.type === ANNOTATION_COMMENT) {
	  return annotation;
	}
      }
    },

    _createAnnotation: function (lineIndex, comments) {
      var ruler = this._wrapper.getAnnotationRuler();
      var view = ruler.getView();
      var viewModel = view.getModel();
      var start = viewModel.getLineStart(lineIndex);
      var end = viewModel.getLineEnd(lineIndex, true);
      var onClickHandler = this._onClickHandler;

      var title = function() {
	var $tooltip = $('<div>').addClass('tooltipTitle comment');
	for (var i = 0; i < comments.length; i++) {
	  var comment = comments[i];
	  $('<div>')
	    .append('<span>[' + comment.date + ']</span>')
	    .append('<span>   </span>')
	    .append('<label>' + comment.sender.id + ':</label>')
	    .append('<span> ' + comment.message + '</span>')
	    .click(function () {
	      onClickHandler.call(null, lineIndex + 1);
	    })
	    .appendTo($tooltip);
	}
	return $tooltip[0]; /* Return DOM element */
      };

      return mAnnotations.AnnotationType.createAnnotation(ANNOTATION_COMMENT,
	start, end, title);
    },

    _addOnClickHandler: function (ruler) {
      var onClickHandler = this._onClickHandler;

      addRulerOnClickHandler(ruler, function (lineIndex, e) {
	if (lineIndex === undefined) return;
	onClickHandler.call(null, lineIndex + 1);
      });
    },
  };

  CommentAnnotator.registerAnnotationType = registerAnnotationType;

  /* What we should do:
   *  (1) register the annotation type
   *  (2) for every editor instance add the annotation type to:
   *      (a) annotation ruler
   *      (b) overview ruler
   *      (c) annotation styler
   *  (3) double click event on annotation ruler is used for bookmarks,
   *      thus to keep it working we use a single click event
   *  (4) XXX change standard multiple annotation overlay,
   *      such that comment annotation is visible
   */

  return CommentAnnotator;
});
