import { useEffect, useState } from 'react'

interface GenreRow { genre: string; count: number }
type GenreMap = Record<string, string>

export function GenreManager() {
  const [genres, setGenres] = useState<GenreRow[]>([])
  const [map, setMap] = useState<GenreMap>({})
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [normalizePreview, setNormalizePreview] = useState<{ changed: number; total: number } | null>(null)
  const [normalizing, setNormalizing] = useState(false)
  const [normalizeDone, setNormalizeDone] = useState(false)

  useEffect(() => {
    fetch('/api/genres/map').then(r => r.json()).then(setMap).catch(() => {})
  }, [])

  async function scan() {
    setScanning(true)
    setNormalizePreview(null)
    setNormalizeDone(false)
    const data = await fetch('/api/genres').then(r => r.json()).catch(() => [])
    setGenres(Array.isArray(data) ? data : [])
    setScanning(false)
  }

  async function saveMapping(variant: string, canonical: string) {
    if (!canonical.trim()) return
    await fetch('/api/genres/map', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant, canonical: canonical.trim() }),
    })
    setMap(m => ({ ...m, [variant.toLowerCase()]: canonical.trim() }))
    setEditing(e => { const n = { ...e }; delete n[variant]; return n })
  }

  async function removeMapping(variant: string) {
    await fetch(`/api/genres/map?variant=${encodeURIComponent(variant)}`, { method: 'DELETE' })
    setMap(m => { const n = { ...m }; delete n[variant.toLowerCase()]; return n })
  }

  async function previewNormalize() {
    setNormalizing(true)
    const data = await fetch('/api/genres/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry: true }),
    }).then(r => r.json()).catch(() => null)
    setNormalizePreview(data)
    setNormalizing(false)
  }

  async function runNormalize() {
    setNormalizing(true)
    await fetch('/api/genres/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry: false }),
    })
    // Bust genre cache and rescan
    await fetch('/api/genres/cache', { method: 'DELETE' })
    setNormalizePreview(null)
    setNormalizeDone(true)
    setNormalizing(false)
    await scan()
  }

  const filtered = genres.filter(g =>
    !filter || g.genre.toLowerCase().includes(filter.toLowerCase())
  )

  const canonicals = [...new Set(Object.values(map))].sort()

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
        position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
      }}>
        <button onClick={scan} disabled={scanning} style={{
          padding: '7px 14px', borderRadius: '5px', fontSize: '13px', fontWeight: 600,
          background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer',
        }}>
          {scanning ? 'Scanning…' : genres.length > 0 ? '↺ Rescan' : 'Scan Library'}
        </button>

        {genres.length > 0 && (
          <>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter genres…"
              style={{
                flex: 1, minWidth: '120px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '4px', color: 'var(--text)', padding: '7px 10px', fontSize: '13px',
              }}
            />
            {normalizePreview === null && !normalizeDone && (
              <button onClick={previewNormalize} disabled={normalizing} style={{
                padding: '7px 14px', borderRadius: '5px', fontSize: '13px',
                background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer',
              }}>
                {normalizing ? '…' : '✦ Normalize'}
              </button>
            )}
            {normalizePreview !== null && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {normalizePreview.changed} tracks will change
                </span>
                <button onClick={runNormalize} disabled={normalizing} style={{
                  padding: '7px 12px', borderRadius: '5px', fontSize: '13px', fontWeight: 600,
                  background: '#22c55e', border: 'none', color: '#fff', cursor: 'pointer',
                }}>
                  {normalizing ? '…' : 'Confirm'}
                </button>
                <button onClick={() => setNormalizePreview(null)} style={{
                  background: 'none', border: 'none', color: 'var(--muted)', fontSize: '16px', cursor: 'pointer',
                }}>✕</button>
              </div>
            )}
            {normalizeDone && (
              <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Library normalized</span>
            )}
          </>
        )}
      </div>

      {/* Genre map legend */}
      {genres.length > 0 && Object.keys(map).length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active mappings
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(map).map(([variant, canonical]) => (
              <div key={variant} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '4px', padding: '3px 8px', fontSize: '12px',
              }}>
                <span style={{ color: 'var(--muted)' }}>{variant}</span>
                <span style={{ color: 'var(--accent)' }}>→</span>
                <span>{canonical}</span>
                <button onClick={() => removeMapping(variant)} style={{
                  background: 'none', border: 'none', color: 'var(--muted)',
                  fontSize: '12px', cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1,
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!scanning && genres.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
          <p>Scan your library to see all genre tags.</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>May take a minute for large libraries.</p>
        </div>
      )}

      {/* Genre table */}
      {filtered.map(({ genre, count }) => {
        const key = genre.toLowerCase()
        const mapped = map[key]
        const editVal = editing[genre]
        const isMapped = !!mapped
        const isEditing = editVal !== undefined

        return (
          <div key={genre} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: isMapped ? 'rgba(234,179,8,0.05)' : 'transparent',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isMapped && <span style={{ color: '#eab308', fontSize: '11px' }}>●</span>}
                <span style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {genre}
                </span>
                {isMapped && (
                  <span style={{ fontSize: '12px', color: 'var(--muted)', flexShrink: 0 }}>
                    → <span style={{ color: 'var(--accent)' }}>{mapped}</span>
                  </span>
                )}
              </div>
            </div>

            <span style={{ fontSize: '12px', color: 'var(--muted)', flexShrink: 0 }}>{count}</span>

            {/* Inline mapping editor */}
            {isEditing ? (
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <input
                  list="canonicals"
                  value={editVal}
                  onChange={e => setEditing(ed => ({ ...ed, [genre]: e.target.value }))}
                  placeholder="Canonical genre…"
                  autoFocus
                  style={{
                    width: '140px', background: 'var(--bg)', border: '1px solid var(--accent)',
                    borderRadius: '4px', color: 'var(--text)', padding: '5px 8px', fontSize: '12px',
                  }}
                />
                <datalist id="canonicals">
                  {canonicals.map(c => <option key={c} value={c} />)}
                </datalist>
                <button
                  onClick={() => saveMapping(genre, editVal)}
                  disabled={!editVal.trim()}
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', color: '#fff', padding: '5px 8px', fontSize: '12px', cursor: 'pointer' }}>
                  ✓
                </button>
                <button
                  onClick={() => setEditing(e => { const n = { ...e }; delete n[genre]; return n })}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--muted)', padding: '5px 7px', fontSize: '12px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(e => ({ ...e, [genre]: mapped ?? '' }))}
                style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: '4px',
                  color: 'var(--muted)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', flexShrink: 0,
                }}
              >
                {isMapped ? 'Edit' : '+ Map'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
