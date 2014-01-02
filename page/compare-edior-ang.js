define([
  '../../../orion-editor/1.00/modules/orion-compare/compare-wrapper',
], function (CompareEditor) {

  function createCompareEditor(id, type, title, oldFile, newFile) {
    var compare = {
      type: type || 'inline',
      files: [
	{ name: oldFile.name, content: oldFile.content },
	{ name: newFile.name, content: newFile.content },
      ],
    };

    return new CompareEditor({
      id: id,
      title: title,
      metaData: { compare: compare },
      initialContent: '',
    });
  }

  var compareEditorController = [
    '$scope', '$element',
    function CompareEditorCtrl($scope, $element) {
      var ctrl = this;

      this.setNewContent = function SetNewContent(content) {
	$scope.editor.setNewContent(content);
      }
      this.setOldContent = function SetOldContent(content) {
	$scope.editor.setOldContent(content);
      }

      $scope.$watch('editor', function (editor) {
	if (!editor) return;
	editor.render($element.find('> div.editor')[0]);
	$scope.editorRendered = true;
      });
    }
  ];

  var compareEditorDirective = function CompareEditorDirective() {
    return {
      restrict: 'E',
      replace: true,
      scope: {},
      templateUrl: 'extensions/hpsw/code-review/1.00/page/html/compare.html',
      controller: compareEditorController,
      link: function (scope, element, attrs) {
	var params = scope.$parent.$eval(attrs.params);

	scope.oldFile = scope.$parent.$eval(attrs.oldFile);
	scope.newFile = scope.$parent.$eval(attrs.newFile);

	scope.editor = createCompareEditor(params.id, params.type, params.title,
	  scope.oldFile, scope.newFile);
      },
    };
  }

  var gitFetchDirective = ['git-service', function GitFetchDirective(gitService) {
    return {
      require: 'compareEditor',
      restrict: 'A',
      controller: function () {},
      link: function (scope, element, attrs, editorCtrl) {
	var oldFile = scope.$parent.$eval(attrs.oldFile);
	var newFile = scope.$parent.$eval(attrs.newFile);

	if (!oldFile.git && !newFile.git) return;

	/* Wait until the editor is rendered */
	scope.$watch('editorRendered', function (rendered) {
	  if (!rendered) return;

	  function getContent(git) {
	    return gitService.showFile(git.repository, git.path, git.revision);
	  }

	  if (oldFile.git) {
	    editorCtrl.setOldContent('Fetching...');
	    getContent(oldFile.git).then(function (content) {
	      editorCtrl.setOldContent(content);
	    }, function (err) {
	      console.error('failed to load', oldFile.name, ':', err);
	      editorCtrl.setOldContent('Error: ' + err);
	    });
	  }
	  if (newFile.git) {
	    editorCtrl.setNewContent('Fetching...');
	    getContent(newFile.git).then(function (content) {
	      editorCtrl.setNewContent(content);
	    }, function (err) {
	      console.error('failed to load', newFile.name, ':', err);
	      editorCtrl.setNewContent('Error: ' + err);
	    });
	  }
	});
      }
    };
  }];

  return {
    init: function (module) {
      module.directive('compareEditor', compareEditorDirective);
      module.directive('gitFetch', gitFetchDirective);
    },
  };
});
