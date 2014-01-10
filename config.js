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
	'notification-service',
      ]
    },
    {
      id: 'code-review-notifications',
      main: 'notifications/code-review-notifications',
      dependencies: [
	'notification-service',
      ]
    },
    {
      id: 'code-review-dashboard',
      main: 'dashboard/code-review',
      dependencies: [
	'mega-menu',
	'code-review-service',
	'code-review-notifications',
      ]
    },
    {
      id: 'code-review-page',
      main: 'page/code-review-page',
      dependencies: [
	'mega-menu',
	'code-review-service',
      ]
    },
    {
      id: 'code-review-ide',
      main: 'ide/code-review-ide-hooks',
      dependencies: [
	'code-review-service',
	'dialog',
      ]
    },
  ]
});
