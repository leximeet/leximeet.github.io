import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 从实际进入浏览器产物的模块生成署名，不把依赖许可改成自有许可。
export function thirdPartyNotices(
  root = dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
) {
  const supplemental = {
    '@docsearch/css@3.8.2': 'docsearch-3.8.2.txt',
    '@docsearch/js@3.8.2': 'docsearch-3.8.2.txt',
    '@docsearch/react@3.8.2': 'docsearch-3.8.2.txt',
    '@mermaid-js/mermaid-mindmap@9.3.0': 'mermaid-mindmap-9.3.0.txt',
  }
  return {
    name: 'leximeet-third-party-notices',
    apply: 'build',
    async generateBundle(options, bundle) {
      if (options.format !== 'es') return
      const packages = new Map()
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        for (const id of Object.keys(chunk.modules)) {
          const normalized = id.split('?')[0].replace(/^\0/, '').replaceAll('\\', '/')
          const marker = '/node_modules/'
          const offset = normalized.lastIndexOf(marker)
          if (offset < 0) continue
          const parts = normalized.slice(offset + marker.length).split('/')
          const depth = parts[0].startsWith('@') ? 2 : 1
          const directory =
            normalized.slice(0, offset + marker.length) + parts.slice(0, depth).join('/')
          if (packages.has(directory)) continue
          const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
          const notices = []
          for (const file of (await readdir(directory)).sort()) {
            if (!/^(?:licen[cs]e|copying|notice)(?:[.\-_]|$)/i.test(file)) continue
            const path = join(directory, file)
            try {
              notices.push(`${file}\n${await readFile(path, 'utf8')}`)
            } catch (error) {
              if (error.code !== 'EISDIR') throw error
            }
          }
          const supplement = supplemental[`${manifest.name}@${manifest.version}`]
          if (!notices.length && supplement) {
            notices.push(
              await readFile(join(root, 'website', '.vitepress', 'licenses', supplement), 'utf8'),
            )
          }
          // 这两包把完整 MIT 原文放在 README 的末尾，不另发 LICENSE 文件。
          if (
            !notices.length &&
            ['fastdom@1.0.12', 'strictdom@1.0.1'].includes(`${manifest.name}@${manifest.version}`)
          ) {
            const readme = await readFile(join(directory, 'README.md'), 'utf8')
            const start = readme.indexOf('(The MIT License)')
            if (start >= 0 && readme.slice(start).includes('Permission is hereby granted')) {
              notices.push(`README.md 许可段\n${readme.slice(start)}`)
            }
          }
          if (!notices.length)
            throw new Error(`进入站点产物的 ${manifest.name} 缺少随包许可文本，请先核对`)
          packages.set(directory, {
            name: manifest.name,
            version: manifest.version,
            license: manifest.license,
            notices,
          })
        }
      }
      const sorted = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
      const source =
        '词遇文档站第三方署名\n以下为实际进入浏览器构建产物的依赖原许可，保留原文。\n\n' +
        sorted
          .map(
            (pkg) =>
              `===== ${pkg.name}@${pkg.version} (${pkg.license ?? '见原文'}) =====\n${pkg.notices.join('\n\n')}`,
          )
          .join('\n\n') +
        '\n'
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.txt', source })
      this.emitFile({
        type: 'asset',
        fileName: 'LICENSE.txt',
        source: await readFile(join(root, 'LICENSE'), 'utf8'),
      })
    },
  }
}
