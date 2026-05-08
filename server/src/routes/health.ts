import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { parseFile } from 'music-metadata'
import { MUSIC_ROOT, RECYCLE_ROOT, safeResolve } from '../lib/roots.js'

export const healthRouter = Router()

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aiff', '.aif', '.opus'])
const TTL = 5 * 60 * 1000

export interface HealthResult { status: 'green' | 'yellow' | 'red'; complete: number; total: number }
const cache = new Map<string, { result: HealthResult; ts: number }>()

// Scans direct audio file children only. If none found, recurses one level into subdirs.
async function scanHealth(dir: string): Promise<HealthResult> {
  let entries
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch {
    return { status: 'red', complete: 0, total: 0 }
  }

  let total = 0, complete = 0

  for (const e of entries) {
    if (!e.isFile()) continue
    const ext = path.extname(e.name).toLowerCase()
    if (!AUDIO_EXTS.has(ext)) continue
    total++
    try {
      const { common } = await parseFile(path.join(dir, e.name), { skipCovers: true, duration: false })
      if (common.title && common.artist && common.album) complete++
    } catch {}
  }

  // No direct audio files — check one level of subdirs (artist-level view)
  if (total === 0) {
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const sub = await scanHealth(path.join(dir, e.name))
      total += sub.total
      complete += sub.complete
    }
  }

  const pct = total === 0 ? 100 : (complete / total) * 100
  return {
    status: pct >= 90 ? 'green' : pct >= 50 ? 'yellow' : 'red',
    complete,
    total,
  }
}

healthRouter.get('/', async (req, res) => {
  const { path: rel, location = 'music' } = req.query as Record<string, string>
  const root = location === 'recycle' ? RECYCLE_ROOT : MUSIC_ROOT
  try {
    const abs = safeResolve(root, rel ?? '.')
    const cached = cache.get(abs)
    if (cached && Date.now() - cached.ts < TTL) { res.json(cached.result); return }
    const result = await scanHealth(abs)
    cache.set(abs, { result, ts: Date.now() })
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// Bust cache for a path and its parent (called after writes)
healthRouter.delete('/', (req, res) => {
  const { path: rel, location = 'music' } = req.query as Record<string, string>
  const root = location === 'recycle' ? RECYCLE_ROOT : MUSIC_ROOT
  try {
    const abs = safeResolve(root, rel ?? '.')
    cache.delete(abs)
    cache.delete(path.dirname(abs))
  } catch {}
  res.json({ ok: true })
})
