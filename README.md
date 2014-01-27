# Code Review extension for HP Pronq IDE

The extension allows the developers to easily create code reviews (aka pull requests),
send them to others and get a feedback.

## Install

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
