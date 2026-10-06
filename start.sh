#!/bin/sh
# 家用 KTV（PiKaraoke 台灣版）：macOS / Linux 在終端機執行 ./start.sh
cd "$(dirname "$0")"

missing=""
command -v ffmpeg >/dev/null || missing="$missing ffmpeg"
command -v node >/dev/null || command -v deno >/dev/null || missing="$missing deno"
if [ -n "$missing" ]; then
  echo "缺少：$missing"
  if command -v brew >/dev/null; then
    echo "正在用 Homebrew 安裝..."
    brew install $missing || exit 1
  elif command -v apt-get >/dev/null; then
    echo "正在用 apt 安裝 ffmpeg（可能會要求輸入密碼）..."
    sudo apt-get update && sudo apt-get install -y ffmpeg || exit 1
    command -v node >/dev/null || command -v deno >/dev/null \
      || curl -fsSL https://deno.land/install.sh | sh -s -- -y
    export PATH="$HOME/.deno/bin:$PATH"
  else
    echo "請先自行安裝：$missing"
    exit 1
  fi
fi

if ! command -v uv >/dev/null; then
  echo "第一次執行：安裝 uv（Python 管理工具）..."
  curl -LsSf https://astral.sh/uv/install.sh | sh || exit 1
  export PATH="$HOME/.local/bin:$PATH"
fi

exec uv run pikaraoke "$@"
