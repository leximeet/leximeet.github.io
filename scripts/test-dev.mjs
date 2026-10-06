import { mkdtemp, rm, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
await mkdir(join(root, '.runtime'), { recursive: true })
const cache = await mkdtemp(join(root, '.runtime', 'dev-cache-'))
try {
  // 每次冷启动，不能靠用户已有优化缓存掩盖开发模块互操作错误。
  const child = spawn(
    process.execPath,
    [
      join(root, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--config',
      'playwright.dev.config.ts',
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, LEXIMEET_DOCS_CACHE_DIR: cache },
    },
  )
  process.exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })
} finally {
  await rm(cache, { recursive: true, force: true })
}
