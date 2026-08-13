#!/bin/sh
set -eu

PORT="${PORT:-8080}"
API_URL="${API_URL:-/api/v1}"
API_BACKEND_URL="${API_BACKEND_URL:-}"

export PORT

mkdir -p /usr/share/nginx/html/assets
cat > /usr/share/nginx/html/assets/config.json <<EOF
{
  "apiUrl": "${API_URL}"
}
EOF

envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /tmp/nginx-base.conf

if [ -n "$API_BACKEND_URL" ]; then
  case "$API_BACKEND_URL" in
    */) ;;
    *) API_BACKEND_URL="${API_BACKEND_URL}/" ;;
  esac
  export API_BACKEND_URL
  envsubst '${API_BACKEND_URL}' < /etc/nginx/api-proxy.snippet > /tmp/nginx-proxy.conf
  awk '
    /# API_PROXY_BLOCK/ {
      while ((getline line < "/tmp/nginx-proxy.conf") > 0) print line
      close("/tmp/nginx-proxy.conf")
      next
    }
    { print }
  ' /tmp/nginx-base.conf > /etc/nginx/conf.d/default.conf
  echo "  API_BACKEND_URL=${API_BACKEND_URL} (reverse proxy enabled)"
else
  grep -v '# API_PROXY_BLOCK' /tmp/nginx-base.conf > /etc/nginx/conf.d/default.conf
fi

echo "ClaimItMed Frontend starting on port ${PORT}"
echo "  API_URL=${API_URL}"

exec "$@"
