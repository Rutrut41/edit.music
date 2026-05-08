import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { MUSIC_ROOT, RECYCLE_ROOT } from '../lib/roots.js'

export const searchRouter = Router()

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aiff', '.aif', '.opus'])
const MAX_RESULTS = 50

async function walk(dir: string, root: string, results: { name: string; path: string; ext: string }[], query: string) {
  if (results.length >= MAX_RESULTS) return
  let entries
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (results.length >= MAX_RESULTS) return
    const abs = path.join(dir, e.name)
    const rel = path.relative(root, abs)
    if (e.isDirectory()) {
      await walk(abs, root, results, query)
    } else {
      const ext = path.extname(e.name).toLowerCase()
      if (AUDIO_EXTS.has(ext) && e.name.toLowerCase().includes(query)) {
        results.push({ name: e.name, path: rel, ext })
      }
    }
  }
}

searchRouter.get('/', async (req, res) => {
  const { q, location = 'music' } = req.query as Record<string, string>
  if (!q || q.trim().length < 2) { res.json([]); return }
  const root = location === 'recycle' ? RECYCLE_ROOT : MUSIC_ROOT
  const results: { name: string; path: string; ext: string }[] = []
  await walk(root, root, results, q.trim().toLowerCase())
  res.json(results)
})
