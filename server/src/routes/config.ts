import { Router } from 'express'
import fs from 'fs/promises'
import { getConfig, saveConfig } from '../lib/config.js'

export const configRouter = Router()

configRouter.get('/', (_req, res) => {
  res.json(getConfig())
})

configRouter.get('/test', async (req, res) => {
  const { path } = req.query as { path: string }
  if (!path) { res.status(400).json({ ok: false, error: 'path required' }); return }
  try {
    const stat = await fs.stat(path)
    if (!stat.isDirectory()) { res.json({ ok: false, error: 'Not a directory' }); return }
    res.json({ ok: true })
  } catch {
    res.json({ ok: false, error: 'Path not found or not accessible' })
  }
})

configRouter.post('/', async (req, res) => {
  const { musicRoot, recycleRoot } = req.body as { musicRoot: string; recycleRoot: string }
  if (!musicRoot || !recycleRoot) {
    res.status(400).json({ error: 'musicRoot and recycleRoot are required' }); return
  }
  try {
    await fs.mkdir(recycleRoot, { recursive: true })
    const config = await saveConfig({ musicRoot, recycleRoot })
    res.json(config)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
