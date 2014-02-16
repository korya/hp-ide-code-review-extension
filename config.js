define({
  author: 'hpsw',
  id: 'code-review',
  version: 1.00,
  description: 'Code review management module',
  moduleLoaders:[
    {
      id: 'code-review-service',
      main: 'client/service/code-review',
      dependencies: [
	'projects-service',
	'git-service',
      ]
    },
    {
      id: 'code-review-notifications',
      main: 'client/notifications/code-review-notifications',
      dependencies: [
	'notification-service',
      ]
    },
    {
      id: 'code-review-dashboard',
      main: 'client/dashboard/code-review-dashboard',
      dependencies: [
	'mega-menu',
	'code-review-service',
	'code-review-notifications',
      ]
    },
    {
      id: 'code-review-page',
      main: 'client/page/code-review-page',
      dependencies: [
	'mega-menu',
	'code-review-service',
	'editors',
	'orion-compare',
      ]
    },
    {
      id: 'code-review-ide',
      main: 'client/ide/code-review-ide-hooks',
      dependencies: [
	'code-review-service',
	'dialog',
      ]
    },
  ]
});
