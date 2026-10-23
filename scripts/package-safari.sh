#!/bin/sh
set -eu
project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
# This applies to this script only; it does not change the Mac's selected developer directory.
if [ -d /Applications/Xcode.app/Contents/Developer ]; then
 export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
packager=''
for candidate in safari-web-extension-packager safari-web-extension-converter; do
 if xcrun --find "$candidate" >/dev/null 2>&1; then packager="$candidate"; break; fi
done
if [ -z "$packager" ]; then
 echo 'Full Xcode is required. Install Xcode from Apple and complete its first launch, then run npm run safari:package again.' >&2
 exit 1
fi
node "$project_root/scripts/prepare-safari.mjs"
xcrun "$packager" "$project_root/safari/extension" --project-location "$project_root/safari/xcode" --app-name Afterglow --bundle-identifier com.afterglow.watchparty --swift --macos-only --copy-resources --no-open
