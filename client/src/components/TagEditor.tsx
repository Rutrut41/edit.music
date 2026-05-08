import { useEffect, useState } from 'react'
import type { TrackRef } from '../App.js'

interface Tags {
  title: string | null
  artist: string | null
  album: string | null
  year: number | null
  track: number | null
  genre: string | null
  duration: number | null
  bitrate: number | null
  codec: string | null
  cover: string | null
}

interface Suggestion {
  mbid: string
  title: string | null
  artist: string | null
  album: string | null
  year: number | null
  track: number | null
  score: number
}

interface Props {
  track: TrackRef
  onClose: () => void
}

export function TagEditor({ track, onClose }: Props) {
  const [tags, setTags] = useState<Tags | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const isRecycle = track.location === 'recycle'

  useEffect(() => {
    setTags(null)
    setSaved(false)
    setSuggestions([])
    setShowSuggestions(false)
    fetch(`/api/tags?path=${encodeURIComponent(track.path)}&location=${track.location}`)
      .then(r => r.json())
      .then(setTags)
  }, [track.path, track.location])

  function update(field: keyof Tags, value: string) {
    setTags(t => t ? { ...t, [field]: value || null } : t)
    setSaved(false)
  }

  async function save() {
    if (!tags || isRecycle) return
    setSaving(true)
    await fetch(`/api/tags?path=${encodeURIComponent(track.path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tags.title, artist: tags.artist, album: tags.album, year: tags.year, track: tags.track, genre: tags.genre }),
    })
    setSaving(false)
    setSaved(true)
  }

  async function suggest() {
    if (!tags) return
    setSuggesting(true)
    setShowSuggestions(true)
    // Use filename as fallback query if no tags filled
    const bare = track.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    const params = new URLSearchParams()
    if (tags.title) params.set('title', tags.title)
    if (tags.artist) params.set('artist', tags.artist)
    if (!tags.title && !tags.artist) params.set('q', bare)
    const data = await fetch(`/api/lookup?${params}`)
      .then(r => r.json())
      .catch(() => [])
    setSuggestions(Array.isArray(data) ? data : [])
    setSuggesting(false)
  }

  function apply(s: Suggestion) {
    setTags(t => t ? {
      ...t,
      title:  s.title  ?? t.title,
      artist: s.artist ?? t.artist,
      album:  s.album  ?? t.album,
      year:   s.year   ?? t.year,
      track:  s.track  ?? t.track,
    } : t)
    setShowSuggestions(false)
    setSaved(false)
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const field = (label: string, key: 'title' | 'artist' | 'album' | 'genre', type = 'text') => (
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        value={(tags as any)?.[key] ?? ''}
        onChange={e => update(key, e.target.value)}
        disabled={isRecycle}
        type={type}
        style={{
          display: 'block', width: '100%', marginTop: '4px',
          background: isRecycle ? 'transparent' : 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: '4px',
          color: 'var(--text)', padding: '8px 10px', fontSize: '14px',
          opacity: isRecycle ? 0.6 : 1,
        }}
      />
    </div>
  )

  return (
    <div style={{ borderTop: '2px solid var(--accent)', background: 'var(--surface)', overflowY: 'auto', maxHeight: '60vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 8px', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {tags?.cover && <img src={tags.cover} style={{ width: 36, height: 36, borderRadius: '3px', objectFit: 'cover' }} />}
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
            {isRecycle ? '🗑 Recycle Bin (read-only)' : 'Edit Tags'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isRecycle && (
            <button onClick={suggest} disabled={suggesting || !tags} style={{
              padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer',
              background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)',
            }}>
              {suggesting ? '…' : '✦ Suggest'}
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* MusicBrainz suggestions */}
      {showSuggestions && (
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src="https://musicbrainz.org/static/images/meb-icons/MusicBrainz.svg" width={14} height={14} style={{ opacity: 0.7 }} />
              MusicBrainz suggestions
            </span>
            <button onClick={() => setShowSuggestions(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '14px', cursor: 'pointer' }}>✕</button>
          </div>
          {suggesting && <p style={{ padding: '8px 16px 12px', color: 'var(--muted)', fontSize: '13px' }}>Searching MusicBrainz…</p>}
          {!suggesting && suggestions.length === 0 && (
            <p style={{ padding: '8px 16px 12px', color: 'var(--muted)', fontSize: '13px' }}>No matches found — try editing the title or artist fields first.</p>
          )}
          {suggestions.map(s => (
            <div key={s.mbid} onClick={() => apply(s)} style={{
              padding: '10px 16px', borderTop: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1a3a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  {[s.artist, s.album, s.year].filter(Boolean).join(' · ')}
                  {s.track ? ` · #${s.track}` : ''}
                </p>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--accent)', marginLeft: '12px', flexShrink: 0 }}>{s.score}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Tag fields */}
      <div style={{ padding: '12px 16px' }}>
        {!tags && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading…</p>}
        {tags && (
          <>
            {tags.duration && (
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>
                {fmt(tags.duration)} · {tags.codec ?? '?'} · {tags.bitrate ? Math.round(tags.bitrate / 1000) + ' kbps' : ''}
              </p>
            )}
            {field('Title', 'title')}
            {field('Artist', 'artist')}
            {field('Album', 'album')}
            {field('Genre', 'genre')}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              {(['year', 'track'] as const).map(key => (
                <div key={key} style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key}</label>
                  <input
                    value={tags[key] ?? ''}
                    onChange={e => update(key, e.target.value)}
                    disabled={isRecycle}
                    type="number"
                    style={{
                      display: 'block', width: '100%', marginTop: '4px',
                      background: isRecycle ? 'transparent' : 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: '4px',
                      color: 'var(--text)', padding: '8px 10px', fontSize: '14px',
                      opacity: isRecycle ? 0.6 : 1,
                    }}
                  />
                </div>
              ))}
            </div>
            {!isRecycle && (
              <button onClick={save} disabled={saving} style={{
                width: '100%', padding: '10px', background: saved ? '#1a3a1a' : 'var(--accent)',
                border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Tags'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
