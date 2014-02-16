#!/bin/sh

set -e

EXT_NAME='code-review'
EXT_AUTHOR='hpsw'
EXT_REPO='https://github.com/korya/hp-ide-code-review-extension.git'
EXT_DIR="app/extensions/$EXT_AUTHOR/$EXT_NAME/1.00"
EXT_DEPS='korya/hp-ide-git-extension:korya/hp-ide-notification-extension'
EXT_NPM_DEPS='socket.io@0.9.16'
EXT_BOWER_DEPS='socket.io-client@0.9.16'

# Install other extensions
for dep in $(echo "$EXT_DEPS" | tr : '\n'); do
  curl -s "https://raw.github.com/$dep/master/install.sh" | sh 
done

[ -n "$(git submodule | grep $EXT_DIR)" ] && exit 0

# Add git submodule containing the extension code
git submodule add "$EXT_REPO" "$EXT_DIR"

JSON_TOOL="${JSON_TOOL:-$(which json || true)}"
if [ -z "$JSON_TOOL" ]; then
  npm install jsontool
  JSON_TOOL='./node_modules/.bin/json'
fi

# Install dependencies
# npm install
for dep in $(echo "$EXT_NPM_DEPS" | tr : '\n'); do
  name="$(echo $dep | sed 's/@.*$//')"
  version="$(echo $dep | sed 's/^[^@]*@//')"
  "$JSON_TOOL" -I -f package.json -E "this.dependencies[\"$name\"]=\"$version\""
  npm install "$name@$version"
done
# npm shrinkwrap

for dep in $(echo "$EXT_BOWER_DEPS" | tr : '\n'); do
  name="$(echo $dep | sed 's/@.*$//')"
  version="$(echo $dep | sed 's/^[^@]*@//')"
  "$JSON_TOOL" -I -f bower.json -E "this.dependencies[\"$name\"]=\"$version\""
done
bower install

# Install the extension
if [ -e "$EXT_DIR/config.js" ]; then
  descriptor="{ id: \"$EXT_NAME\", version: 1, author: \"$EXT_AUTHOR\" }"
  "$JSON_TOOL" -I -f server/file-system/extensions/manifest.json \
    -E "this.defaultExtension.push($descriptor)"
fi
SERVER_MODULE_PATH="../$EXT_DIR/server"
if [ -e "server/$SERVER_MODULE_PATH" ]; then
  "$JSON_TOOL" -I -f server/file-system/config-files/config.json \
    -E "this.modules[\"$EXT_NAME\"]=\"$SERVER_MODULE_PATH\""
fi

# Apply required patches
if [ -d "$EXT_DIR"/patch.d ]; then
  for p in "$EXT_DIR"/patch.d/[0-9][0-9]-*.diff; do
    echo "Patch apply: $p"
    cat "$p" | patch -p1
  done
fi
