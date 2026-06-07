import fs from 'fs/promises'
import path from 'path'

export interface AppConfig {
  musicRoot: string
  recycleRoot: string
  configured: boolean
}

function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR
  if ((process as any).pkg) return path.join(path.dirname(process.execPath), 'edit-music-data')
  return path.join(process.cwd(), 'data')
}

function configPath(): string {
  return path.join(dataDir(), 'config.json')
}

const _defaults: AppConfig = {
  musicRoot:   process.env.MUSIC_ROOT   ?? '',
  recycleRoot: process.env.RECYCLE_ROOT ?? '',
  configured:  !!(process.env.MUSIC_ROOT && process.env.RECYCLE_ROOT),
}

let _config: AppConfig = { ..._defaults }

export function getConfig(): Readonly<AppConfig> {
  return _config
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(configPath(), 'utf8')
    _config = { ..._defaults, ...JSON.parse(raw) }
  } catch {
    _config = { ..._defaults }
  }
  return _config
}

export async function saveConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
  _config = { ..._config, ...updates, configured: true }
  await fs.mkdir(dataDir(), { recursive: true })
  await fs.writeFile(configPath(), JSON.stringify(_config, null, 2))
  return _config
}
