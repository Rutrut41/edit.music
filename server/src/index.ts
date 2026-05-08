import express from 'express'
import cors from 'cors'
import { filesRouter } from './routes/files.js'
import { tagsRouter } from './routes/tags.js'
import { audioRouter } from './routes/audio.js'
import { searchRouter } from './routes/search.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/api/files', filesRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/audio', audioRouter)
app.use('/api/search', searchRouter)

app.listen(PORT, () => {
  console.log(`edit.music server on :${PORT}`)
  console.log(`  music:   ${process.env.MUSIC_ROOT ?? '/storage/music'}`)
  console.log(`  recycle: ${process.env.RECYCLE_ROOT ?? '/storage/recycle_bin'}`)
})
