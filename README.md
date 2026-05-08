# edit.music

Mobile-first audio tag editor with preview player for self-hosted music libraries.

- Browse your library, tap a track, edit tags
- **MusicBrainz lookup** — one-tap suggestions from the community database, no account needed
- Preview player with queue, swipe navigation, album art
- Recycle bin browser — rescue tracks deleted by Lidarr/Beets before they're gone
- Works as a PWA (Add to Home Screen on iOS/Android)
- Supports MP3, FLAC, M4A, OGG, WAV, AIFF

## Quick start (Docker)

```yaml
services:
  edit-music:
    image: ghcr.io/khildren/edit.music:latest
    restart: unless-stopped
    ports:
      - "3333:3001"
    volumes:
      - /path/to/music:/storage/music
      - /path/to/recycle:/storage/recycle_bin   # optional
```

## Development

```bash
git clone https://github.com/khildren/edit.music
cd edit.music
./dev.sh        # starts server :3001 + Vite :5173
```

Set `MUSIC_ROOT` and `RECYCLE_ROOT` in `server/.env` to point at your library:

```
MUSIC_ROOT=/mnt/user/music
RECYCLE_ROOT=/mnt/user/music/.recycle
```

## Stack

- **Server** — Node.js + TypeScript + Express, `music-metadata` (read), `node-taglib-sharp` (write), MusicBrainz REST API
- **Client** — React 18 + Vite PWA, zero UI framework dependencies

## MusicBrainz

Metadata suggestions are powered by [MusicBrainz](https://musicbrainz.org), the open community music database. Results are proxied through the local server to respect the 1 req/sec rate limit. No account or API key required.

## License

MIT
