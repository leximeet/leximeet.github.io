import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const normalized = (source) => source.replaceAll('\r\n', '\n').trim()
function target(root, path) {
  const value = resolve(root, path)
  if (!value.startsWith(root + sep)) throw new Error(`引用越出仓库：${path}`)
  return value
}

// 只读核验图源、正文和亮暗原字节；不启动浏览器，不重写任何文件。
export async function checkDocDiagrams(repository) {
  const root = resolve(repository)
  const sources = JSON.parse(await readFile(target(root, 'docs/diagrams/sources.json'), 'utf8'))
  const manifest = JSON.parse(
    await readFile(target(root, 'docs/diagrams/rendered/manifest.json'), 'utf8'),
  )
  if (sources.format !== 1 || manifest.format !== 1 || !sources.diagrams?.length)
    throw new Error('图清单版本或内容无效')
  if (sources.diagrams.length !== manifest.diagrams?.length) throw new Error('源图与导出数量不一致')
  const exported = new Map(manifest.diagrams.map((item) => [item.source, item]))
  if (exported.size !== manifest.diagrams.length) throw new Error('导出清单有重复源')
  const declared = new Set()
  for (const item of sources.diagrams) {
    if (declared.has(item.source)) throw new Error(`图源重复：${item.source}`)
    declared.add(item.source)
    const bytes = await readFile(target(root, item.source))
    const rendered = exported.get(item.source)
    if (sha(bytes) !== item.sourceSha256 || sha(bytes) !== rendered?.sourceSha256)
      throw new Error(`图源 SHA 不一致：${item.source}`)
    const page = await readFile(target(root, item.page), 'utf8')
    const blocks = [
      ...page.matchAll(
        /<!-- leximeet-diagram:\s*([^\s]+)\s*-->([\s\S]*?)<!-- \/leximeet-diagram -->/g,
      ),
    ].filter((block) => block[1] === item.id)
    if (blocks.length !== 1) throw new Error(`正文缺失或重复图块：${item.page} / ${item.id}`)
    const block = blocks[0][2]
    const code = [...block.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)]
    if (code.length !== 1 || normalized(code[0][1]) !== normalized(bytes.toString('utf8')))
      throw new Error(`折叠源码与 mmd 不一致：${item.page} / ${item.id}`)
    if (!/<details>[\s\S]*```mermaid[\s\S]*<\/details>/.test(block))
      throw new Error(`缺少可编辑源码：${item.page} / ${item.id}`)
    const image = /<img\b[^>]*\bsrc="([^"]+)"/.exec(block)
    const dark = /<source\b[^>]*media="\(prefers-color-scheme: dark\)"[^>]*srcset="([^"]+)"/.exec(
      block,
    )
    for (const [theme, reference] of [
      ['light', image?.[1]],
      ['dark', dark?.[1]],
    ]) {
      const output = rendered.outputs?.[theme]
      if (
        !output?.path ||
        !reference ||
        resolve(dirname(target(root, item.page)), reference) !== target(root, output.path)
      )
        throw new Error(`picture ${theme} 与导出目标不一致：${item.page} / ${item.id}`)
      const svg = await readFile(target(root, output.path))
      if (sha(svg) !== output.sha256) throw new Error(`SVG SHA 不一致：${output.path}`)
      if (
        !svg.includes(Buffer.from('<svg')) ||
        /<script\b|<foreignObject\b/i.test(svg.toString('utf8'))
      )
        throw new Error(`SVG 不是严格文本图：${output.path}`)
    }
    // 规范伴随页仍指向未修改的原规范代码围栏；一般页面已同源替换，不伪造旧图记录。
    if (item.origin && item.origin !== item.page) {
      const origin = await readFile(target(root, item.origin), 'utf8')
      const original = [...origin.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)][
        item.originDiagram - 1
      ]?.[1]
      // 提取清单采用原规范代码围栏 trim 后的语义文本 hash；完整规范的原字节另由合同清单核验。
      if (!original || sha(Buffer.from(normalized(original))) !== item.originDiagramSha256)
        throw new Error(`规范来源图 SHA 不一致：${item.origin}`)
    }
  }
  const actual = (await readdir(target(root, 'docs/diagrams'))).filter((name) =>
    name.endsWith('.mmd'),
  )
  if (
    actual.length !== declared.size ||
    actual.some((name) => !declared.has(`docs/diagrams/${name}`))
  )
    throw new Error('存在未声明或遗失的 mmd 图源')
  return { diagrams: declared.size, outputs: declared.size * 2 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--repo')
  if (index < 0 || !process.argv[index + 1])
    throw new Error('用法：node scripts/check-doc-diagrams.mjs --repo 仓库目录')
  const result = await checkDocDiagrams(process.argv[index + 1])
  console.log(
    `图表一致性通过：${result.diagrams} 图源 / ${result.outputs} 亮暗 SVG / 正文折叠源码与 picture`,
  )
}
