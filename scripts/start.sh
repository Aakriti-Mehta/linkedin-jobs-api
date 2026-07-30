#!/bin/sh
set -e

if command -v node >/dev/null 2>&1; then
  exec node cli.js "$@"
fi

NODE_BIN="/Users/aakritimehta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [ -x "$NODE_BIN" ]; then
  exec "$NODE_BIN" cli.js "$@"
fi

echo "node is not available on PATH and the bundled runtime was not found." >&2
exit 1
