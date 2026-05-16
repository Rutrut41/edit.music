#!/bin/bash
# Kill anything left over from a previous run
pkill -9 -f "tsx/esm|vite" 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null
sleep 1

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Demote Plex to idle I/O and low CPU so it doesn't fight during tag writes
PLEX_PID=$(pgrep -f "Plex Media Server" 2>/dev/null | head -1)
if [ -n "$PLEX_PID" ]; then
  ionice -c 3 -p "$PLEX_PID" 2>/dev/null && echo "Demoted Plex (pid $PLEX_PID) to idle I/O"
  renice +15 -p "$PLEX_PID" 2>/dev/null && echo "Reniced Plex to +15 CPU"
fi

# Start server at best-effort class, highest priority (0)
cd "$ROOT/server" && \
  ionice -c 2 -n 0 node --env-file=.env --import tsx/esm src/index.ts &
SERVER_PID=$!
echo "Server started (pid $SERVER_PID) with ionice best-effort/0"

sleep 3

cd "$ROOT/client" && \
  npm run dev -- --host 0.0.0.0 --port 5173 &

wait
