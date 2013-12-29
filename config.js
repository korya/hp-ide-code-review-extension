define({
  author: 'hpsw',
  id: 'code-review',
  version: 1.00,
  description: 'Code review management module',
  moduleLoaders:[
    {
      id: 'code-review-service',
      main: 'code-review-service',
      dependencies: [
	'projects-service',
	'git-service',
      ]
    },
    {
      id: 'code-review-ui',
      main: 'code-review-presenter',
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
