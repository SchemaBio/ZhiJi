#!/bin/sh
set -eu

if [ "${NODE_ENV:-}" = "production" ] && [ "${NEXT_PUBLIC_DEV_MOCK_AUTH:-}" = "true" ]; then
  echo "NEXT_PUBLIC_DEV_MOCK_AUTH=true is not allowed in production" >&2
  exit 1
fi

API_URL="${ZHIJI_API_URL:-${NEXT_PUBLIC_API_URL:-/api}}"
BACKEND="${ZHIJI_BACKEND:-loligo}"
SUPPORT_EMAIL="${ZHIJI_SUPPORT_EMAIL:-${NEXT_PUBLIC_SUPPORT_EMAIL:-}}"
PASSWORD_RESET_ENABLED="${ZHIJI_PASSWORD_RESET_ENABLED:-${NEXT_PUBLIC_PASSWORD_RESET_ENABLED:-false}}"
DEFAULT_LOCALE="${ZHIJI_DEFAULT_LOCALE-${NEXT_PUBLIC_DEFAULT_LOCALE-zh-CN}}"
case "$DEFAULT_LOCALE" in
  zh-CN|zh-Hant|en|es-419) ;;
  *)
    echo "ZHIJI_DEFAULT_LOCALE must be zh-CN, zh-Hant, en, or es-419" >&2
    exit 1
    ;;
esac
export DEFAULT_LOCALE
case "$BACKEND" in
  loligo|onykia) ;;
  *)
    echo "ZHIJI_BACKEND must be loligo or onykia" >&2
    exit 1
    ;;
esac
export API_URL BACKEND SUPPORT_EMAIL PASSWORD_RESET_ENABLED

node <<'NODE' > /app/public/runtime-config.js
const clean = (value) => String(value || '').replace(/[\r\n]/g, '');
const config = {
  API_URL: clean(process.env.API_URL || '/api'),
  BACKEND: clean(process.env.BACKEND || 'loligo'),
  SUPPORT_EMAIL: clean(process.env.SUPPORT_EMAIL || ''),
  UPLOAD_ORIGINS: clean(process.env.ZHIJI_UPLOAD_ORIGINS || ''),
  PASSWORD_RESET_ENABLED: clean(process.env.PASSWORD_RESET_ENABLED || 'false'),
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
};
process.stdout.write(`window.__ZHIJI_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`);
NODE

exec "$@"
