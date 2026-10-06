import { readdir, readFile, writeFile, mkdir, mkdtemp, rm, realpath } from 'node:fs/promises'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import { assertDiagramSource, diagramTokens } from '../website/.vitepress/theme/diagram-theme.mjs'
import { normalizeLegacyDiagram } from '../website/.vitepress/theme/diagram-source.mjs'
import { startDiagramServer } from './diagram-server.mjs'

const site = dirname(dirname(fileURLToPath(import.meta.url)))
const index = process.argv.indexOf('--repo')
if (index < 0 || !process.argv[index + 1])
  throw new Error('用法：npm run render:diagrams -- --repo 仓库目录')
const repo = await realpath(resolve(process.argv[index + 1]))
const directory = join(repo, 'docs', 'diagrams')
const sources = (await readdir(directory, { withFileTypes: true }))
  .filter((item) => item.isFile() && item.name.endsWith('.mmd'))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))
if (!sources.length) throw new Error('docs/diagrams 中没有 .mmd 图源，拒绝生成空清单')
await mkdir(join(site, '.runtime'), { recursive: true })
const temporary = await mkdtemp(join(site, '.runtime', 'diagram-renderer-'))
const manifest = {
  format: 1,
  renderer: 'mermaid@11.17.2',
  style: 'leximeet-blue-round-v1',
  tokens: diagramTokens,
  diagrams: [],
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
let server, browser
try {
  const html = `<!doctype html><html><body><script type="module">
    import mermaid from 'mermaid';
    import { diagramConfig } from '/website/.vitepress/theme/diagram-theme.mjs';
    window.renderDiagram = async (source, dark, id) => {
      mermaid.initialize(diagramConfig(dark));
      return (await mermaid.render(id, source)).svg;
    };
  </script></body></html>`
  await writeFile(join(temporary, 'index.html'), html)
  server = await startDiagramServer(createServer, {
    configFile: false,
    root: site,
    cacheDir: join(temporary, 'cache'),
    logLevel: 'error',
    optimizeDeps: { include: ['mermaid', 'mermaid > fastdom'] },
  })
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const origin = server.origin
  // 导出不访问 CDN、外部字体或用户网页；越界请求直接拒绝。
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  )
  await page.goto(`${origin}/${relative(site, temporary).replaceAll('\\', '/')}/index.html`)
  await page.waitForFunction(() => typeof window.renderDiagram === 'function')
  await mkdir(join(directory, 'rendered'), { recursive: true })
  for (const file of sources) {
    const bytes = await readFile(join(directory, file.name))
    const source = assertDiagramSource(normalizeLegacyDiagram(bytes.toString('utf8')))
    const record = { source: `docs/diagrams/${file.name}`, sourceSha256: sha(bytes), outputs: {} }
    for (const dark of [false, true]) {
      const theme = dark ? 'dark' : 'light'
      const id = `lm-${sha(bytes).slice(0, 12)}-${theme}`
      const svg = await page.evaluate(
        async ({ source, dark, id }) => window.renderDiagram(source, dark, id),
        { source, dark, id },
      )
      if (!svg.includes('<svg') || svg.includes('<foreignObject') || /<script\b/i.test(svg))
        throw new Error(`${file.name}: 导出不是严格文本 SVG`)
      const output = `docs/diagrams/rendered/${file.name.slice(0, -4)}.${theme}.svg`
      await writeFile(join(repo, output), svg + '\n')
      record.outputs[theme] = { path: output, sha256: sha(Buffer.from(svg + '\n')) }
    }
    manifest.diagrams.push(record)
  }
  await writeFile(
    join(directory, 'rendered', 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
  console.log(
    `图表导出通过：${sources.length} 个源图，${sources.length * 2} 个亮暗 SVG；${join(directory, 'rendered', 'manifest.json')}`,
  )
} finally {
  await browser?.close()
  await server?.close()
  await rm(temporary, { recursive: true, force: true })
}
