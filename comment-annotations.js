define([
  'orion/editor/annotations',
  'orion/compare/compareRulers',
], function(mAnnotations, mCompareRulers) {
  'use strict';

  var ANNOTATION_COMMENT = 'code-review.annotation.comment';

  function registerAnnotationType() {
    var styleClass = 'comment';
    var properties = {
      title: 'Code review comment annotation',
      style: {
	styleClass: "annotation " + styleClass,
      },
      html: "<div class='annotationHTML " + styleClass + "'></div>",
      overviewStyle: {
	styleClass: "annotationOverview " + styleClass,
      },
      lineStyle: {
	styleClass: "annotationLine " + styleClass,
      },
    };

    mAnnotations.AnnotationType.registerType(ANNOTATION_COMMENT, properties);
  }

  function showCommentTree(lineIndex, e) {
    console.log('showCommentTree():', {lineIndex:lineIndex, e:e});

    if (lineIndex === undefined || lineIndex === -1) return;

//     var view = this.getView();
//     var viewModel = view.getModel();
//     var annotationModel = this.getAnnotationModel();
//     var lineStart = editor.mapOffset(viewModel.getLineStart(lineIndex));
//     var lineEnd = editor.mapOffset(viewModel.getLineEnd(lineIndex));
//     var annotations = annotationModel.getAnnotations(lineStart, lineEnd);
//     var bookmark = null;
//     while (annotations.hasNext()) {
//       var annotation = annotations.next();
//       if (annotation.type === AT.ANNOTATION_BOOKMARK) {
//         bookmark = annotation;
//         break;
//       }
//     }
//     if (bookmark) {
//       annotationModel.removeAnnotation(bookmark);
//     } else {
//       bookmark = AT.createAnnotation(AT.ANNOTATION_BOOKMARK, lineStart, lineEnd);
//       bookmark.title = undefined;
//       annotationModel.addAnnotation(bookmark);
//     }
  }

  function addRulerOnClickHandler(ruler, newHandler) {
    var oldHandler = ruler.onClick;

    ruler.onClick = function (lineIndex, e) {
      console.log(' +++ onClick:', {lineIndex:lineIndex, e:e});
      if (oldHandler !== undefined) oldHandler.call(ruler, lineIndex, e);
      newHandler.call(ruler, lineIndex, e);
    }
  }

  function addOnClickHandler(ruler, onClickHandler) {
    addRulerOnClickHandler(ruler, function (lineIndex, e) {
      var ruler = this;
      var annotation;
      if (lineIndex === undefined) return;
      onClickHandler.call(null, lineIndex + 1, annotation);
    });
  }

  function isInlineCompareView(view) {
    return view.hasOwnProperty('_editor');
  }
  function addToInlineCompareView(view, onClickHandler) {
    /* inline compare widget -- there is only one editor, but
     *   - it has 2 line number
     *   - it has an annotation ruler, but it's unvisible by default
     */
    var annotationRuler = view._editor.getAnnotationRuler();
    var annotationStyler = view._editor.getAnnotationStyler();

    if (annotationStyler) {
      annotationStyler.addAnnotationType(ANNOTATION_COMMENT);
    }

    if (annotationRuler) {
      annotationRuler.addAnnotationType(ANNOTATION_COMMENT);
      addOnClickHandler(annotationRuler, onClickHandler);
      view._editor.setAnnotationRulerVisible(true);
    }

    // XXX Need to distinguish old and new line number rulers
    //     addOnClickHandler(view._rulerOrigin, onClickHandler);
    addOnClickHandler(view._rulerNew, onClickHandler);
  }

  function isTwoWayCompareView(view) {
    return view.hasOwnProperty('_editors');
  }
  function addToTwoWayCompareView(view, onClickHandler) {
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
    var annotationStyler = view._editors[1].getAnnotationStyler();
    var annotationRuler = view._editors[1].getAnnotationRuler();
    var lineNumberRuler;
    
    if (annotationStyler) {
      annotationStyler.addAnnotationType(ANNOTATION_COMMENT);
    }

    if (annotationRuler) {
      /* XXX change standard multiple annotation overlay,
       *     such that comment annotation is visible
       */
      annotationRuler.addAnnotationType(ANNOTATION_COMMENT);
      addOnClickHandler(annotationRuler, onClickHandler);
    }

    /* CompareView editors have a custom line number ruler */
    lineNumberRuler = _.find(view._editors[1].getTextView().getRulers(), function (r) {
      return r instanceof mCompareRulers.LineNumberCompareRuler;
    });
    if (lineNumberRuler) {
      addOnClickHandler(lineNumberRuler, onClickHandler);
    }

//     view._overviewRuler.addAnnotationType(ANNOTATION_COMMENT);
  }

  function addToEditor(compareEditor, onClickHandler) {
    var view = compareEditor.getCompareView();

    if (isInlineCompareView(view)) {
      addToInlineCompareView(view, onClickHandler);
    } else if (isTwoWayCompareView(view)) {
      addToTwoWayCompareView(view, onClickHandler);
    } else {
      console.error('Failed to add comments annotation to compare editor:',
	  compareEditor);
      return;
    }

    /* XXX Create annotations on commented lines */
  }

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

  return {
    registerAnnotationType: registerAnnotationType,
    addToEditor: addToEditor,
  };
});
