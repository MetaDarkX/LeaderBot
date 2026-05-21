#!/bin/sh
# Garante pastas de sessão/cache graváveis e encerra com o usuário node.
# Sem volume em /app/.wwebjs_auth cada redeploy pede QR de novo.
set -e

for dir in /app/.wwebjs_auth /app/.wwebjs_cache /app/logs; do
  mkdir -p "$dir"
  chown -R node:node "$dir" 2>/dev/null || true
done

exec gosu node "$@"
