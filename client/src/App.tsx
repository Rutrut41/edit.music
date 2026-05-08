import { useState } from 'react'
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

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('music')
  const [selectedTrack, setSelectedTrack] = useState<TrackRef | null>(null)
  const queue = useQueue()

  const activeLocation: Location = activeTab === 'recycle' ? 'recycle' : 'music'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        {activeTab === 'genres' ? (
          <GenreManager />
        ) : (
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
