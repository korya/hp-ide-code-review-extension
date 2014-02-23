# Code Review for HP Pronq IDE

The extension allows the developers to easily create code reviews (aka pull requests),
send them to others and get a feedback.


The extension was developed in the framework of
[winter13-14 "Industrial Project" course](http://www.cs.technion.ac.il/~cs234313/projects/#semester#W14)
of
[Computer Science faculty](http://www.cs.technion.ac.il/)
in
[Technion](http://www.technion.ac.il/). The goal of the project was to develop an integrated offline code review system for HP web-based IDE that allows any developer to easily
create and send a code review request to his colleagues and get a feedback.


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

For more details, see:
 - [Site](http://korya.github.io/hp-ide-code-review-extension)
 - [Wiki](https://github.com/korya/hp-ide-code-review-extension/wiki)
 - [Wiki-Objectives](https://github.com/korya/hp-ide-code-review-extension/wiki/Objectives)
 - [Wiki-Methodology](https://github.com/korya/hp-ide-code-review-extension/wiki/Methodology)
 - [Wiki-Achievements](https://github.com/korya/hp-ide-code-review-extension/wiki/Achievements)

## Screenshots

A new code review request can be created in IDE page:
 - user can select a reviewer
 - user can select a change (commit)

![Dialog to create a new code review request](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/code-review-create.png)

Code Review extensions adds 2 new pages (open MegaMenu to see this), `Review Dashboard` and `Code Review`:

![2 new pages in Mega Menu](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/code-review-mega-menu.png)

`Review Dashboard` page lists all code reviews the user is involved in (author or reviewer):

![Code Review Dashboard page](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/code-review-dashboard.png)

`Code Review` page is dedicated for working on a selected code review request

![Code Review page](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/code-review-page.png)

Left column of `Code Review` page displays the review details:
 - top half displays the review state and a file tree of changed files
 - bottom half displays other review details

![Left column displays the review details](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/code-review-page-details.png)

Right column of `Code Review` page displays:
 - list of current comment threads
 - list of comments for a selected thread; available threads are:
    - 'Show all review comments' -- all review comments
    - 'Show review-wide comment thread' -- comments for a review as a whole, not related to any specific file
    - 'Show all file comments' -- all comments related to a specific file
    - 'Show file-wide comment thread' -- comments for a file as a whole, not related to any specific line
    - 'Show file-line comment thread' -- comments for a specific line in a specific file

![Right column displays a list of available comment threads and select comment thread](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/code-review-page-thread-list.png)

Center column of `Code Review` page displays the `diff`s of changed files:
 - open files are listed at top
 - at most one selected file diff is displayed
 - Orion's Compare widget is user to show the diff
 - commented lines have a bold font and a dialog icon on the left ruler

![Center column displays the diff](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/code-review-page-diff-area.png)
