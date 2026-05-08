import { useEffect, useState, useCallback } from 'react'
import type { Location, TrackRef } from '../App.js'
import { useSwipe } from '../hooks/useSwipe.js'

interface Entry { name: string; type: 'dir' | 'file'; ext: string | null }
type HealthStatus = 'green' | 'yellow' | 'red'
interface HealthResult { status: HealthStatus; complete: number; total: number }

interface Props {
  location: Location
  selectedPath: string | null
  onSelect: (track: TrackRef) => void
  onPlay: (track: TrackRef) => void
  onAddToQueue: (track: TrackRef) => void
}

const DOT: Record<HealthStatus, string> = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }

export function FileBrowser({ location, selectedPath, onSelect, onPlay, onAddToQueue }: Props) {
  const [stack, setStack] = useState<string[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState<Map<string, HealthResult>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [bulkGenre, setBulkGenre] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkSaved, setBulkSaved] = useState(false)

  const currentPath = stack.join('/')

  useEffect(() => { setStack([]) }, [location])

  useEffect(() => {
    setLoading(true)
    setHealth(new Map())
    setSelected(new Set())
    setSelectMode(false)
    setBulkGenre('')
    setBulkSaved(false)
    fetch(`/api/files/${location}?path=${encodeURIComponent(currentPath || '.')}`)
      .then(r => r.json())
      .then(data => {
        const list: Entry[] = Array.isArray(data) ? data : []
        setEntries(list)
        // Fire health requests for all dirs in parallel after list loads
        const dirs = list.filter(e => e.type === 'dir')
        dirs.forEach(dir => {
          const rel = currentPath ? `${currentPath}/${dir.name}` : dir.name
          fetch(`/api/health?path=${encodeURIComponent(rel)}&location=${location}`)
            .then(r => r.json())
            .then((h: HealthResult) => setHealth(prev => new Map(prev).set(dir.name, h)))
            .catch(() => {})
        })
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [location, currentPath])

  function enter(name: string) { setStack(s => [...s, name]) }
  function back() { setStack(s => s.slice(0, -1)) }

  const toggleSelect = useCallback((path: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
    setBulkSaved(false)
  }, [])

  function selectAll() {
    const files = entries.filter(e => e.type === 'file')
    const paths = files.map(e => currentPath ? `${currentPath}/${e.name}` : e.name)
    setSelected(new Set(paths))
  }

  function clearSelection() {
    setSelected(new Set())
    setSelectMode(false)
    setBulkGenre('')
    setBulkSaved(false)
  }

  async function applyBulk() {
    if (!bulkGenre.trim() || selected.size === 0) return
    setBulkSaving(true)
    await fetch('/api/tags/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: Array.from(selected), genre: bulkGenre.trim() }),
    })
    // Bust health cache for current folder
    await fetch(`/api/health?path=${encodeURIComponent(currentPath || '.')}&location=${location}`, { method: 'DELETE' })
    setBulkSaving(false)
    setBulkSaved(true)
    clearSelection()
  }

  const hasFiles = entries.some(e => e.type === 'file')

  const swipeHandlers = useSwipe({ onSwipeRight: () => { if (stack.length > 0) back() } })

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: selected.size > 0 ? '72px' : 0 }} {...swipeHandlers}>
      {/* Back + select-all toolbar */}
      {stack.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 16px',
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 1,
        }}>
          <button onClick={back} style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            fontSize: '13px', cursor: 'pointer', padding: 0,
          }}>
            ← {stack[stack.length - 1]}
          </button>
          {hasFiles && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectMode && (
                <button onClick={selectAll} style={{
                  background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
                  borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
                }}>Select All</button>
              )}
              <button onClick={() => { setSelectMode(s => !s); setSelected(new Set()) }} style={{
                background: selectMode ? 'var(--accent)' : 'none',
                border: '1px solid var(--accent)', color: selectMode ? '#fff' : 'var(--accent)',
                borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
              }}>
                {selectMode ? 'Cancel' : '☑ Select'}
              </button>
            </div>
          )}
        </div>
      )}

      {loading && <p style={{ padding: '16px', color: 'var(--muted)', fontSize: '13px' }}>Loading…</p>}

      {entries.map(entry => {
        const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name
        const isSelected = fullPath === selectedPath
        const checked = selected.has(fullPath)
        const trackRef: TrackRef = { path: fullPath, location, name: entry.name }
        const h = entry.type === 'dir' ? health.get(entry.name) : undefined

        return (
          <div key={entry.name} style={{
            display: 'flex', alignItems: 'center',
            padding: '11px 16px',
            borderBottom: '1px solid var(--border)',
            background: checked ? '#1a2a3a' : isSelected ? '#1e1a3a' : 'transparent',
            gap: '10px',
          }}>
            {/* Checkbox in select mode (files only) */}
            {selectMode && entry.type === 'file' && (
              <div
                onClick={() => toggleSelect(fullPath)}
                style={{
                  width: 18, height: 18, borderRadius: '3px', flexShrink: 0, cursor: 'pointer',
                  border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                  background: checked ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', color: '#fff',
                }}
              >
                {checked ? '✓' : ''}
              </div>
            )}

            {/* Health dot for dirs */}
            {entry.type === 'dir' && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <span style={{ fontSize: '16px' }}>📁</span>
                {h && (
                  <span style={{
                    position: 'absolute', bottom: -1, right: -2,
                    width: 8, height: 8, borderRadius: '50%',
                    background: DOT[h.status],
                    border: '1px solid var(--bg)',
                    display: 'block',
                  }} title={`${h.complete}/${h.total} tracks complete`} />
                )}
              </div>
            )}

            {entry.type === 'file' && !selectMode && (
              <span style={{ fontSize: '16px' }}>
                {entry.ext === '.flac' ? '🎼' : '🎵'}
              </span>
            )}

            <span
              style={{ flex: 1, fontSize: '14px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onClick={() => {
                if (selectMode && entry.type === 'file') { toggleSelect(fullPath); return }
                entry.type === 'dir' ? enter(entry.name) : onSelect(trackRef)
              }}
            >
              {entry.name}
            </span>

            {entry.type === 'file' && !selectMode && (
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  title="Add to queue"
                  onClick={() => onAddToQueue(trackRef)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '4px', padding: '4px 7px', fontSize: '12px', cursor: 'pointer' }}>
                  +
                </button>
                <button
                  title="Play now"
                  onClick={() => onPlay(trackRef)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                  ▶
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)', borderTop: '2px solid var(--accent)',
          padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center',
          zIndex: 10,
        }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', flexShrink: 0 }}>
            {selected.size} track{selected.size !== 1 ? 's' : ''}
          </span>
          <input
            value={bulkGenre}
            onChange={e => { setBulkGenre(e.target.value); setBulkSaved(false) }}
            placeholder="Genre…"
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '4px', color: 'var(--text)', padding: '7px 10px', fontSize: '13px',
            }}
          />
          <button
            onClick={applyBulk}
            disabled={bulkSaving || !bulkGenre.trim()}
            style={{
              padding: '7px 14px', borderRadius: '5px', fontSize: '13px', fontWeight: 600,
              background: bulkSaved ? '#1a3a1a' : 'var(--accent)', border: 'none', color: '#fff',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {bulkSaving ? '…' : bulkSaved ? '✓ Done' : 'Apply'}
          </button>
          <button onClick={clearSelection} style={{
            background: 'none', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer', flexShrink: 0,
          }}>✕</button>
        </div>
      )}
    </div>
  )
}
