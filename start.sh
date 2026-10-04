#!/bin/sh
# macOS / Linux：在終端機執行 ./start.sh
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "找不到 Node.js，請先到 https://nodejs.org 安裝 LTS 版"; exit 1; }
[ -d node_modules ] || npm install --no-audit --no-fund || exit 1
[ -f .env ] || cp .env.example .env
exec npm start
