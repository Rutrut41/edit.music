import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { parseFile } from 'music-metadata'
import { File as TagFile } from 'node-taglib-sharp'
import { MUSIC_ROOT } from '../lib/roots.js'

export const genresRouter = Router()

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aiff', '.aif', '.opus'])
const MAP_PATH = path.resolve(process.cwd(), 'genre-map.json')

const DEFAULT_MAP: Record<string, string> = {}

async function loadMap(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(MAP_PATH, 'utf8'))
  } catch {
    return { ...DEFAULT_MAP }
  }
}

async function saveMap(map: Record<string, string>) {
  await fs.writeFile(MAP_PATH, JSON.stringify(map, null, 2))
}

// Walk entire library, collect all genre tag values with counts
async function scanGenres(dir: string, counts: Map<string, number>) {
  let entries
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) {
      await scanGenres(abs, counts)
    } else {
      const ext = path.extname(e.name).toLowerCase()
      if (!AUDIO_EXTS.has(ext)) continue
      try {
        const { common } = await parseFile(abs, { skipCovers: true, duration: false })
        const genre = common.genre?.[0]
        if (genre) counts.set(genre, (counts.get(genre) ?? 0) + 1)
      } catch {}
    }
  }
}

// Cache the genre scan — expensive op
let genreCache: { data: { genre: string; count: number }[]; ts: number } | null = null
const GENRE_TTL = 30 * 60 * 1000

// Cached read — used internally and for the normalize dry-run
genresRouter.get('/', async (_req, res) => {
  if (genreCache && Date.now() - genreCache.ts < GENRE_TTL) {
    res.json(genreCache.data); return
  }
  const counts = new Map<string, number>()
  await scanGenres(MUSIC_ROOT, counts)
  const data = Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
  genreCache = { data, ts: Date.now() }
  res.json(data)
})

// SSE live scan — streams progress events then a final 'done' with results
genresRouter.get('/scan', async (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  // Keep the connection alive through Vite proxy / nginx
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000)
  res.on('close', () => clearInterval(ping))

  const counts = new Map<string, number>()
  let folders = 0, artists = 0, tracks = 0, current = ''

  async function walk(dir: string, depth: number) {
    let entries
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const abs = path.join(dir, e.name)
      if (e.isDirectory()) {
        folders++
        if (depth === 0) {
          artists++
          current = e.name
          send({ type: 'progress', folders, artists, tracks, genres: counts.size, current })
        }
        await walk(abs, depth + 1)
      } else {
        const ext = path.extname(e.name).toLowerCase()
        if (!AUDIO_EXTS.has(ext)) continue
        tracks++
        try {
          const { common } = await parseFile(abs, { skipCovers: true, duration: false })
          const genre = common.genre?.[0]
          if (genre) counts.set(genre, (counts.get(genre) ?? 0) + 1)
        } catch {}
        if (tracks % 200 === 0) {
          send({ type: 'progress', folders, artists, tracks, genres: counts.size, current })
        }
      }
    }
  }

  await walk(MUSIC_ROOT, 0)

  const data = Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)

  genreCache = { data, ts: Date.now() }
  send({ type: 'done', data, folders, artists, tracks, genres: counts.size })
  res.end()
})

genresRouter.delete('/cache', (_req, res) => {
  genreCache = null
  res.json({ ok: true })
})

genresRouter.get('/map', async (_req, res) => {
  res.json(await loadMap())
})

// Add or update a single mapping  { variant, canonical }
genresRouter.patch('/map', async (req, res) => {
  const { variant, canonical } = req.body
  if (!variant || !canonical) { res.status(400).json({ error: 'variant and canonical required' }); return }
  const map = await loadMap()
  map[variant.trim().toLowerCase()] = canonical.trim()
  await saveMap(map)
  res.json({ ok: true, map })
})

// Remove a mapping
genresRouter.delete('/map', async (req, res) => {
  const { variant } = req.query as Record<string, string>
  if (!variant) { res.status(400).json({ error: 'variant required' }); return }
  const map = await loadMap()
  delete map[variant.trim().toLowerCase()]
  await saveMap(map)
  res.json({ ok: true, map })
})

// Normalize library — dry=true for preview, dry=false to apply
genresRouter.post('/normalize', async (req, res) => {
  const dry = req.body?.dry !== false
  const map = await loadMap()
  if (Object.keys(map).length === 0) { res.json({ changed: 0, total: 0, dry }); return }

  let total = 0, changed = 0
  const toChange: { abs: string; canonical: string }[] = []

  async function walk(dir: string) {
    let entries
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const abs = path.join(dir, e.name)
      if (e.isDirectory()) { await walk(abs); continue }
      const ext = path.extname(e.name).toLowerCase()
      if (!AUDIO_EXTS.has(ext)) continue
      total++
      try {
        const { common } = await parseFile(abs, { skipCovers: true, duration: false })
        const genre = common.genre?.[0]
        if (!genre) continue
        const canonical = map[genre.trim().toLowerCase()]
        if (canonical && canonical !== genre) toChange.push({ abs, canonical })
      } catch {}
    }
  }

  await walk(MUSIC_ROOT)
  changed = toChange.length

  if (!dry) {
    // Process in batches of 10 to avoid hammering the FS
    for (let i = 0; i < toChange.length; i += 10) {
      await Promise.all(toChange.slice(i, i + 10).map(async ({ abs, canonical }) => {
        try {
          const file = TagFile.createFromPath(abs)
          file.tag.genres = [canonical]
          file.save()
          file.dispose()
        } catch {}
      }))
    }
    genreCache = null // bust cache after writes
  }

  res.json({ changed, total, dry })
})
