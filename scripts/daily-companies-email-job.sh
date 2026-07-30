#!/bin/sh
set -e

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  . "$REPO_ROOT/.env"
  set +a
fi

if command -v node >/dev/null 2>&1; then
  exec node "$REPO_ROOT/daily-companies-email-job.js" "$@"
fi

NODE_BIN="/Users/aakritimehta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [ -x "$NODE_BIN" ]; then
  exec "$NODE_BIN" "$REPO_ROOT/daily-companies-email-job.js" "$@"
fi

echo "node is not available on PATH and the bundled runtime was not found." >&2
exit 1
