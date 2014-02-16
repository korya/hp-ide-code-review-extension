# Code Review for HP Pronq IDE

The extension allows the developers to easily create code reviews (aka pull requests),
send them to others and get a feedback.

## Install

Fast and easy way:
```bash
$ cd <IDE source>
$ curl -Ls http://tiny.cc/cawcodereview | sh
```

Otherwise, use the steps below.

#### Manual installation

The extension depends on 2 others, so first please install them:
 - [Notification extension](https://github.com/korya/hp-ide-notification-extension#install)
 - [Git extension](https://github.com/korya/hp-ide-git-extension#install)

So, first please install these extensions.

Now you're ready to install the extension itself. Clone it to your source tree:

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
  - `x1-fix-for-ide-layout.diff`: minor fix for IDE layout [not required]
```bash
$ cat app/extensions/hpsw/code-review/1.00/patch.d/[0-9][0-9]-*.diff | patch -p1
```

## Details

XXX Describe a use case: developer, reviewer

XXX Describe the behind-the-scenes procedures

XXX Decribe extension modules

XXX Screenshots
