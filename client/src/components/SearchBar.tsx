import { useEffect, useRef, useState } from 'react'
import type { Location, TrackRef } from '../App.js'

interface Result { name: string; path: string; ext: string }

interface Props {
  location: Location
  onPlay: (track: TrackRef) => void
  onAddToQueue: (track: TrackRef) => void
  onSelect: (track: TrackRef) => void
}

export function SearchBar({ location, onPlay, onAddToQueue, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (query.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    timer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&location=${location}`)
        .then(r => r.json())
        .then(data => { setResults(Array.isArray(data) ? data : []); setOpen(true) })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
  }, [query, location])

  function clear() { setQuery(''); setResults([]); setOpen(false) }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tracks…"
          style={{
            flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '7px 10px', color: 'var(--text)',
            fontSize: '14px', outline: 'none',
          }}
        />
        {query && (
          <button onClick={clear} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}>✕</button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          maxHeight: '55vh', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {loading && <p style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '13px' }}>Searching…</p>}
          {!loading && results.length === 0 && (
            <p style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '13px' }}>No results for "{query}"</p>
          )}
          {results.map(r => {
            const track: TrackRef = { path: r.path, location, name: r.name }
            return (
              <div key={r.path} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '15px', flexShrink: 0 }}>{r.ext === '.flac' ? '🎼' : '🎵'}</span>
                <span
                  onClick={() => { onSelect(track); clear() }}
                  style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  title={r.path}
                >
                  {r.name.replace(/\.[^.]+$/, '')}
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.path.split('/').slice(0, -1).join(' / ')}
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => onAddToQueue(track)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '4px', padding: '4px 7px', fontSize: '12px', cursor: 'pointer' }}>+</button>
                  <button onClick={() => { onPlay(track); clear() }} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>▶</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
