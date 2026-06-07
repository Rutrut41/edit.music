import express from 'express'
import cors from 'cors'
import { filesRouter } from './routes/files.js'
import { tagsRouter } from './routes/tags.js'
import { audioRouter } from './routes/audio.js'
import { searchRouter } from './routes/search.js'
import { lookupRouter } from './routes/lookup.js'
import { healthRouter } from './routes/health.js'
import { genresRouter } from './routes/genres.js'
import { loadConfig, getConfig } from './lib/config.js'
import { configRouter } from './routes/config.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: /^https?:\/\/(localhost|127\.0\.0\.1|tokyo7\.local)(:\d+)?$/ }))
app.use(express.json())

app.use('/api/config', configRouter)
app.use('/api/files', filesRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/audio', audioRouter)
app.use('/api/search', searchRouter)
app.use('/api/lookup', lookupRouter)
app.use('/api/health', healthRouter)
app.use('/api/genres', genresRouter)

loadConfig().then(() => {
  const cfg = getConfig()
  app.listen(PORT, () => {
    console.log(`edit.music server on :${PORT}`)
    if (cfg.configured) {
      console.log(`  music:   ${cfg.musicRoot}`)
      console.log(`  recycle: ${cfg.recycleRoot}`)
    } else {
      console.log('  not configured — open the browser to complete setup')
    }
  })
})
