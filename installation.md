---
layout: default
title: "Installation Instructions"
lead: "pakanturiki manguger"
---

## Automatic Installation

Fast and easy way:
```bash
$ cd <IDE source>
$ curl -Ls http://tiny.cc/cawcodereview | sh
```

This will install `Code Review` extension and its dependencies `Git` and `Notification` extensions, install `npm` and `bower` dependencies and apply all patches.

If the automatic installation does not work for you, open a bug and use the [steps below](#manual-installation).

## Manual installation

First, we will use [jsontool](https://github.com/trentm/json) in order to modify
`JSON`-formatted configuration files, so first make sure it's installed:

```bash
$ npm install -g jsontool
```

`Code Review` extension depends on 2 others, so first please install them:
 - [Notification extension](#notification-extension)
 - [Git extension](#git-extension)

So, first please install these extensions.

### Notification extension

Clone the extension into your tree:

```bash
$ cd <IDE source>
$ git submodule add \
    https://github.com/korya/hp-ide-notification-extension.git \
    app/extensions/hpsw/notifications/1.00
```

Tell the server to load the extension in
`server/file-system/extensions/manifest.json`:

```bash
$ json -I -f server/file-system/extensions/manifest.json \
  -E 'this.defaultExtension.push({"id":"notifications","version":1,"author":"hpsw"})'
```

In current implementattion, in addition to the installation of the extension,
you have to apply a patch, that reserves a space for notification icon by
putting a placeholder for it. To apply the patch:

```bash
$ cd <IDE source>
$ patch -p1 <app/extensions/hpsw/notifications/1.00/patch.d/00-notification-placeholder.diff
```

### Git extension

Clone the extension into your tree:

```bash
$ cd <IDE source>
$ git submodule add \
    https://github.com/korya/hp-ide-git-extension.git \
    app/extensions/hpsw/git-service/1.00
```

Install the dependencies:

```bash
$ json -I -f package.json -E 'this.dependencies["git-rest-api"]="0.1.1"'
$ npm install git-rest-api@0.1.1
```

Tell the server to load the extension:
 - register server side code:
```bash
$ json -I -f server/file-system/config-files/config.json \
  -E 'this.modules["git-service"]="../app/extensions/hpsw/git-service/1.00/server"'
```
 - register client side code:
```bash
$ json -I -f server/file-system/extensions/manifest.json \
  -E 'this.defaultExtension.push({"id":"git-service","version":1,"author":"hpsw"})'
```

### Code Review extension

Now you're ready to install the `Code Review` extension itself. Clone it to your source tree:

```bash
$ cd <IDE source>
$ git submodule add \
    https://github.com/korya/hp-ide-code-review-extension.git \
    app/extensions/hpsw/code-review/1.00
```

Install the dependencies:

```bash
$ json -I -f package.json -E 'this.dependencies["socket.io"]="0.9.16"'
$ npm install socket.io@0.9.16
$ json -I -f bower.json -E 'this.dependencies["socket.io-client"]="0.9.16"'
$ bower install
```

Tell the server to load the extension:
 - register server side code:
```bash
$ json -I -f server/file-system/config-files/config.json \
  -E 'this.modules["code-review"]="../app/extensions/hpsw/code-review/1.00/server"'
```
 - register client side code:
```bash
$ json -I -f server/file-system/extensions/manifest.json \
  -E 'this.defaultExtension.push({"id":"code-review","version":1,"author":"hpsw"})'
```

In addition, you have to apply the following patches, providing a functionality
that is still missing in a mainstream:
  - `00-support-socket.io.diff`: server supports `socket.io`
  - `01-integrate-orion-compare.diff`: integrate `Orion's Compare` into IDE
  - `02-fix-persistence-mock.diff`: fixes for persistence mock service
  - `03-fix-id-persistence-mongodb.diff`: fixes for persistence mongodb service
  - `04-fix-orion-compare-i18n-issue.diff`: workaround for i18n issue in `Orion's Compare`
  - `05-users-round-robin.diff`: add more users assigned in round robin manner
  - `x1-fix-for-ide-layout.diff`: minor fix for IDE layout (not required)
```bash
$ cat app/extensions/hpsw/code-review/1.00/patch.d/[0-9][0-9]-*.diff | patch -p1
```

Good job! Now you should have a source tree with a functioning Code Review system.
