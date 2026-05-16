import { useState, useEffect, useRef } from 'react'
import { FileBrowser } from './components/FileBrowser.js'
import { TagEditor } from './components/TagEditor.js'
import { Player } from './components/Player.js'
import { SearchBar } from './components/SearchBar.js'
import { GenreManager } from './components/GenreManager.js'
import { useQueue } from './hooks/useQueue.js'

export type Location = 'music' | 'recycle'
type Tab = 'music' | 'genres' | 'recycle'

export interface TrackRef {
  path: string
  location: Location
  name: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'music',  label: '🎵 Library' },
  { id: 'genres', label: '🏷 Genres' },
  { id: 'recycle', label: '🗑 Recycle' },
]

interface ServerStatus {
  label: string
  detail: string
  progress: number | null  // 0-1 for determinate, null for indeterminate
}

function useServerStatus(): ServerStatus | null {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const [scan, norm, tok] = await Promise.all([
          fetch('/api/genres/scan').then(r => r.json()).catch(() => null),
          fetch('/api/genres/normalize').then(r => r.json()).catch(() => null),
          fetch('/api/genres/tokenize').then(r => r.json()).catch(() => null),
        ])
        if (scan?.running) {
          setStatus({ label: 'Scanning library', detail: `${(scan.progress?.tracks ?? 0).toLocaleString()} tracks · ${(scan.progress?.genres ?? 0).toLocaleString()} genres`, progress: null })
        } else if (norm?.running) {
          const det = norm.phase === 'writing'
            ? `Retagging ${norm.written.toLocaleString()} / ${norm.toChange.toLocaleString()} tracks`
            : `Scanning ${norm.scanned.toLocaleString()} tracks · ${norm.toChange.toLocaleString()} to retag`
          const prog = norm.phase === 'writing' && norm.toChange > 0 ? norm.written / norm.toChange : null
          setStatus({ label: 'Normalizing genres', detail: det, progress: prog })
        } else if (tok?.running) {
          const det = tok.phase === 'writing'
            ? `Splitting ${tok.written.toLocaleString()} / ${tok.toChange.toLocaleString()} tracks`
            : `Scanning ${tok.scanned.toLocaleString()} tracks · ${tok.toChange.toLocaleString()} will split`
          const prog = tok.phase === 'writing' && tok.toChange > 0 ? tok.written / tok.toChange : null
          setStatus({ label: 'Splitting genres', detail: det, progress: prog })
        } else {
          setStatus(null)
        }
      } catch { setStatus(null) }
    }
    poll()
    ref.current = setInterval(poll, 2000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [])

  return status
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('music')
  const [selectedTrack, setSelectedTrack] = useState<TrackRef | null>(null)
  const queue = useQueue()
  const serverStatus = useServerStatus()

  const activeLocation: Location = activeTab === 'recycle' ? 'recycle' : 'music'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {serverStatus && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {serverStatus.label}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{serverStatus.detail}</span>
          </div>
          <div style={{ height: '2px', background: 'var(--border)', overflow: 'hidden' }}>
            {serverStatus.progress === null ? (
              <div style={{ height: '100%', width: '35%', background: 'var(--accent)', animation: 'scan-slide 1.4s ease-in-out infinite' }} />
            ) : (
              <div style={{ height: '100%', background: 'var(--accent)', width: `${serverStatus.progress * 100}%`, transition: 'width 0.5s ease' }} />
            )}
          </div>
        </div>
      )}
      <nav style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        paddingTop: 'var(--safe-top)',
        flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '12px', background: 'none', border: 'none',
            color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            {tab.label}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Keep GenreManager always mounted so it never loses scroll/state */}
        <div style={{ display: activeTab === 'genres' ? 'flex' : 'none', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
          <GenreManager />
        </div>
        {activeTab !== 'genres' && (
          <>
            <SearchBar
              location={activeLocation}
              onPlay={track => queue.playNow(track)}
              onAddToQueue={track => queue.add(track)}
              onSelect={setSelectedTrack}
            />
            <FileBrowser
              location={activeLocation}
              onSelect={setSelectedTrack}
              onPlay={track => queue.playNow(track)}
              onAddToQueue={track => queue.add(track)}
              selectedPath={selectedTrack?.path ?? null}
            />
            {selectedTrack && (
              <TagEditor track={selectedTrack} onClose={() => setSelectedTrack(null)} />
            )}
          </>
        )}
      </div>

      {queue.current && (
        <Player queue={queue} onClose={queue.clear} />
      )}
    </div>
  )
}
