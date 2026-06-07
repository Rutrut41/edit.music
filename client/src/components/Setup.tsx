import { useState } from 'react'

interface Props {
  onComplete: () => void
}

type TestState = 'idle' | 'testing' | 'ok' | 'error'

export function Setup({ onComplete }: Props) {
  const isWin = navigator.userAgent.includes('Windows')
  const isMac = navigator.userAgent.includes('Mac')

  const [musicRoot,   setMusicRoot]   = useState('')
  const [recycleRoot, setRecycleRoot] = useState('')
  const [musicTest,   setMusicTest]   = useState<TestState>('idle')
  const [recycleTest, setRecycleTest] = useState<TestState>('idle')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function testPath(p: string, set: (s: TestState) => void) {
    if (!p.trim()) return
    set('testing')
    const res = await fetch(`/api/config/test?path=${encodeURIComponent(p.trim())}`)
    const data = await res.json()
    set(data.ok ? 'ok' : 'error')
  }

  async function testMusicPath() {
    await testPath(musicRoot, setMusicTest)
    if (!recycleRoot.trim() && musicRoot.trim()) {
      const m = musicRoot.trim().replace(/[\\/]+$/, '')
      const sep = m.includes('\\') ? '\\' : '/'
      setRecycleRoot(`${m}${sep}.recycle`)
      setRecycleTest('idle')
    }
  }

  async function handleSave() {
    if (!musicRoot.trim() || !recycleRoot.trim()) {
      setError('Both paths are required.'); return
    }
    if (musicTest !== 'ok') {
      setError('Please verify the Music Folder path first.'); return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicRoot: musicRoot.trim(), recycleRoot: recycleRoot.trim() }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Save failed'); return }
      onComplete()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const exampleMusic  = isWin ? 'C:\\Users\\you\\Music' : isMac ? '/Users/you/Music' : '/home/you/music'
  const exampleBin    = isWin ? 'C:\\Users\\you\\Music\\.recycle' : isMac ? '/Users/you/Music/.recycle' : '/home/you/music/.recycle'

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            edit<span style={{ color: 'var(--accent)' }}>.</span>music
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            First-run setup
          </div>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              Music Folder
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={musicRoot}
                onChange={e => { setMusicRoot(e.target.value); setMusicTest('idle') }}
                onBlur={() => testMusicPath()}
                placeholder={exampleMusic}
                spellCheck={false}
                style={{
                  flex: 1, background: '#0f0f0f', border: `1px solid ${musicTest === 'ok' ? '#4ade80' : musicTest === 'error' ? '#f87171' : 'var(--border)'}`,
                  borderRadius: 8, padding: '10px 12px', color: 'var(--text)',
                  fontSize: 13, fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.15s',
                }}
              />
              <button
                onClick={() => testMusicPath()}
                style={{
                  padding: '0 14px', background: 'none', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {musicTest === 'testing' ? '…' : musicTest === 'ok' ? '✓ OK' : musicTest === 'error' ? '✗ bad' : 'test'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Full path to your music library root
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              Recycle Bin Folder
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={recycleRoot}
                onChange={e => { setRecycleRoot(e.target.value); setRecycleTest('idle') }}
                onBlur={() => testPath(recycleRoot, setRecycleTest)}
                placeholder={exampleBin}
                spellCheck={false}
                style={{
                  flex: 1, background: '#0f0f0f', border: `1px solid ${recycleTest === 'ok' ? '#4ade80' : recycleTest === 'error' ? '#f87171' : 'var(--border)'}`,
                  borderRadius: 8, padding: '10px 12px', color: 'var(--text)',
                  fontSize: 13, fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.15s',
                }}
              />
              <button
                onClick={() => testPath(recycleRoot, setRecycleTest)}
                style={{
                  padding: '0 14px', background: 'none', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {recycleTest === 'testing' ? '…' : recycleTest === 'ok' ? '✓ OK' : recycleTest === 'error' ? '✗ bad' : 'test'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Created automatically if it doesn't exist yet
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#f87171', background: '#2a1010', border: '1px solid #5a2020', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !musicRoot.trim() || !recycleRoot.trim()}
            style={{
              padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              opacity: (!musicRoot.trim() || !recycleRoot.trim()) ? 0.45 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Start edit.music →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--muted)' }}>
          Settings saved to disk — not needed again after first run
        </div>
      </div>
    </div>
  )
}
