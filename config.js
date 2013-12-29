define({
  author: 'hpsw',
  id: 'code-review',
  version: 1.00,
  description: 'Code review management module',
  moduleLoaders:[
    {
      id: 'code-review-service',
      main: 'service/code-review',
      dependencies: [
	'projects-service',
	'git-service',
      ]
    },
    {
      id: 'code-review-ui',
      main: 'ui/code-review',
      dependencies: [
	'code-review-service',
	'ide-layout',
	'editors',
	'dialog',
	'orion-compare',
      ]
    },
  ]
});
