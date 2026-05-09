const PLEX_URL   = process.env.PLEX_URL?.replace(/\/$/, '')
const PLEX_TOKEN = process.env.PLEX_TOKEN

let musicSectionId: string | null | undefined = undefined  // undefined = not yet fetched

async function getMusicSectionId(): Promise<string | null> {
  if (musicSectionId !== undefined) return musicSectionId
  if (!PLEX_URL || !PLEX_TOKEN) { musicSectionId = null; return null }
  try {
    const res = await fetch(`${PLEX_URL}/library/sections?X-Plex-Token=${PLEX_TOKEN}`, {
      headers: { Accept: 'application/json' },
    })
    const data = await res.json() as any
    const dirs: any[] = data?.MediaContainer?.Directory ?? []
    const section = dirs.find(d => d.type === 'artist') // Plex music libraries have type=artist
    musicSectionId = section?.key ?? null
    if (musicSectionId) console.log(`[plex] music library section: ${musicSectionId}`)
    else console.warn('[plex] no music library found — check PLEX_URL and PLEX_TOKEN')
  } catch (e: any) {
    console.warn('[plex] could not reach server:', e.message)
    musicSectionId = null
  }
  return musicSectionId
}

export async function plexRefresh() {
  if (!PLEX_URL || !PLEX_TOKEN) return
  const id = await getMusicSectionId()
  if (!id) return
  try {
    await fetch(`${PLEX_URL}/library/sections/${id}/refresh?X-Plex-Token=${PLEX_TOKEN}`)
  } catch {}
}
