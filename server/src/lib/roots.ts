import path from 'path'

export const MUSIC_ROOT = process.env.MUSIC_ROOT ?? '/storage/music'
export const RECYCLE_ROOT = process.env.RECYCLE_ROOT ?? '/storage/recycle_bin'

export function safeResolve(root: string, rel: string): string {
  const resolved = path.resolve(root, rel)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('Path traversal rejected')
  return resolved
}
