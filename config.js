define({
  author: 'hpsw',
  id: 'code-review',
  version: 1.00,
  description: 'Code review management module',
  moduleLoaders:[
    {
      id: 'code-review',
      main: 'code-review',
      dependencies: [
	'orion-compare',
	'projects-service',
	'git-service',
      ]
    }
  ]
});
