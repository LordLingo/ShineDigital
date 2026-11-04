#!/usr/bin/env bash
# Runs every check, then rebuilds the site. Stops at the first failure.
#
#   bash tools/verify.sh
#
# The browser test needs Playwright with Chromium (already there in Claude's workspace).
set -euo pipefail
cd "$(dirname "$0")/.."

JSCHECK="${TMPDIR:-/tmp}/shine-jscheck.js"

echo "== Canvas: syntax check"
python3 tests/check.py project/Main.dc.html "$JSCHECK"
node "$JSCHECK"
echo "== Canvas: language test (look for missing=[] in both languages)"
node tests/test_i18n.js project/Main.dc.html
echo "== Canvas: WhatsApp test"
node tests/wa-test.js project/Main.dc.html
echo "== Build public/"
node tools/build-static.js
echo "== Browser test on the built site"
node tests/static-browser.test.js
echo
echo "All checks passed."
