#!/bin/bash
# Kill anything left over from a previous run
pkill -9 -f "tsx/esm|vite" 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null
sleep 1

ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/server" && \
  MUSIC_ROOT=/mnt/user/music RECYCLE_ROOT=/mnt/user/music/.recycle \
  node --import tsx/esm --watch src/index.ts &

sleep 3

cd "$ROOT/client" && \
  npm run dev -- --host 0.0.0.0 --port 5173 &

wait
