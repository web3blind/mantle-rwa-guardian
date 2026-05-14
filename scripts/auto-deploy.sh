#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-mantleguardian}"
APP_DIR="${APP_DIR:-/www/wwwroot/mantleguardian.xyz}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3004}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/www/server/nodejs/v22.22.1/bin}"
LOCK_FILE="${LOCK_FILE:-/tmp/${APP_NAME}-auto-deploy.lock}"
LOG_PREFIX="[${APP_NAME}-auto-deploy]"

export HOME="${HOME:-/root}"
export PATH="${NODE_BIN_DIR}:/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:${PATH:-}"

log() {
  printf '%s %s %s\n' "$(date -Is)" "$LOG_PREFIX" "$*"
}

if ! command -v git >/dev/null 2>&1; then
  log "git not found"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  log "npm not found"
  exit 1
fi
if ! command -v pm2 >/dev/null 2>&1; then
  log "pm2 not found"
  exit 1
fi

mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "another deploy is running; skip"
  exit 0
fi

cd "$APP_DIR"

git config --global --add safe.directory "$APP_DIR" >/dev/null 2>&1 || true

current_rev="$(git rev-parse HEAD)"
log "checking origin/${BRANCH} from ${current_rev}"
git fetch --quiet origin "$BRANCH"
remote_rev="$(git rev-parse "origin/${BRANCH}")"

if [ "$current_rev" = "$remote_rev" ]; then
  log "already up to date (${current_rev})"
  exit 0
fi

log "new commit detected: ${current_rev} -> ${remote_rev}"

# Keep ignored runtime files (.env, data/, node_modules/) while making tracked files match GitHub.
git reset --hard "origin/${BRANCH}"

# Install exactly from lockfile. Full optional deps are needed by Vitest/Rolldown native bindings.
npm ci
npm test
npm run typecheck

PORT="$PORT" pm2 restart "$APP_NAME" --update-env
pm2 save

# Fast local health check after restart.
curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null
log "deploy complete: ${remote_rev}"
