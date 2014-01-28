# Code Review extension for HP Pronq IDE

The extension allows the developers to easily create code reviews (aka pull requests),
send them to others and get a feedback.

## Install

### Prerequisites

This extension depends on:
 - [Notification extension](http://github.com/korya/hp-ide-notification-extension)
 - [Git extension](http://github.com/korya/hp-ide-git-extension)

So, first please install these extensions.

### Patches

In addition, you have to apply some patches, providing a functionality that is still
missing in a mainstream.

TO BE DONE...

### Install Instructions

Now you're ready to install the extension itself.

```shell
$ cd <IDE source>
$ git submodule add \
    https://github.com/korya/hp-ide-code-review-extension.git \
    app/extensions/hpsw/code-review/1.00
```

Tell the server to load the extension:
 - add server side code by adding the following line to
   `server/file-system/config-files/config.json`:
   ```javascript
     "code-review": "../app/extensions/hpsw/code-review/1.00/server"
   ```
 - add client side code by adding the following line to
   `server/file-system/extensions/manifest.json`:
   ```javascript
     {"id":"code-review","version":1,"author":"hpsw"},
   ```

## Details

XXX Describe a use case: developer, reviewer

XXX Describe the behind-the-scenes procedures

XXX Decribe extension modules

XXX Screenshots
