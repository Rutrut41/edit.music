import { Router } from 'express'

export const lookupRouter = Router()

const MB_BASE = 'https://musicbrainz.org/ws/2'
const UA = 'edit.music/0.1.0 (https://github.com/khildren/edit.music)'

interface MBRecording {
  id: string
  title: string
  length?: number
  score: number
  'artist-credit'?: { name: string; artist: { name: string } }[]
  releases?: {
    id: string
    title: string
    date?: string
    'track-count'?: number
    media?: { position: number; 'track-count': number; track?: { number: string; position: number }[] }[]
  }[]
}

lookupRouter.get('/', async (req, res) => {
  const { title = '', artist = '', q = '' } = req.query as Record<string, string>

  const query = q.trim() ||
    [title && `recording:"${title}"`, artist && `artist:"${artist}"`].filter(Boolean).join(' AND ')

  if (!query) { res.json([]); return }

  try {
    const url = `${MB_BASE}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=8`
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!r.ok) throw new Error(`MusicBrainz ${r.status}`)
    const data = await r.json() as { recordings?: MBRecording[] }

    const results = (data.recordings ?? []).map(rec => {
      const artistName = rec['artist-credit']?.[0]?.name ?? rec['artist-credit']?.[0]?.artist?.name ?? null
      const release = rec.releases?.[0]
      const trackNum = release?.media?.[0]?.track?.[0]?.number ?? null

      return {
        mbid:    rec.id,
        title:   rec.title,
        artist:  artistName,
        album:   release?.title ?? null,
        year:    release?.date ? parseInt(release.date.slice(0, 4), 10) || null : null,
        track:   trackNum ? parseInt(trackNum, 10) || null : null,
        score:   rec.score,
      }
    })

    res.json(results)
  } catch (e: any) {
    res.status(502).json({ error: e.message })
  }
})
