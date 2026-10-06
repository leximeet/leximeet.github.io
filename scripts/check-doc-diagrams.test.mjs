import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { checkDocDiagrams } from './check-doc-diagrams.mjs'
const sha = (value) => createHash('sha256').update(value).digest('hex')
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'leximeet-diagram-check-'))
  try {
    await mkdir(join(root, 'docs/diagrams/rendered'), { recursive: true })
    const source = 'flowchart LR\n A[输入] --> B[保存]\n',
      svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>真实文本</text></svg>\n'
    await writeFile(join(root, 'docs/diagrams/flow.mmd'), source)
    for (const theme of ['light', 'dark'])
      await writeFile(join(root, `docs/diagrams/rendered/flow.${theme}.svg`), svg)
    await writeFile(
      join(root, 'docs/diagrams/sources.json'),
      JSON.stringify({
        format: 1,
        diagrams: [
          {
            id: 'flow',
            page: 'docs/guide.md',
            source: 'docs/diagrams/flow.mmd',
            sourceSha256: sha(source),
          },
        ],
      }),
    )
    await writeFile(
      join(root, 'docs/diagrams/rendered/manifest.json'),
      JSON.stringify({
        format: 1,
        diagrams: [
          {
            source: 'docs/diagrams/flow.mmd',
            sourceSha256: sha(source),
            outputs: Object.fromEntries(
              ['light', 'dark'].map((theme) => [
                theme,
                { path: `docs/diagrams/rendered/flow.${theme}.svg`, sha256: sha(svg) },
              ]),
            ),
          },
        ],
      }),
    )
    await writeFile(
      join(root, 'docs/guide.md'),
      `<!-- leximeet-diagram: flow -->\n<picture><source media="(prefers-color-scheme: dark)" srcset="diagrams/rendered/flow.dark.svg"><img src="diagrams/rendered/flow.light.svg"></picture>\n<details>\n\n\`\`\`mermaid\n${source}\`\`\`\n</details>\n<!-- /leximeet-diagram -->`,
    )
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
test('真实源、两主题输出、折叠代码与 picture 可以逐字节对账', () =>
  fixture(async (root) => {
    assert.deepEqual(await checkDocDiagrams(root), { diagrams: 1, outputs: 2 })
  }))
test('只改 SVG 或只改 mmd，拒绝旧摘要和陈旧图片', () =>
  fixture(async (root) => {
    await writeFile(join(root, 'docs/diagrams/rendered/flow.light.svg'), '<svg>陈旧</svg>')
    await assert.rejects(checkDocDiagrams(root), /SVG SHA/)
    await writeFile(join(root, 'docs/diagrams/flow.mmd'), 'flowchart LR\n A-->C')
    await assert.rejects(checkDocDiagrams(root), /图源 SHA/)
  }))
test('折叠源码与 picture 漂移不能通过', () =>
  fixture(async (root) => {
    const page = join(root, 'docs/guide.md'),
      original = await readFile(page, 'utf8')
    await writeFile(page, original.replace('B[保存]', 'B[陈旧]'))
    await assert.rejects(checkDocDiagrams(root), /折叠源码/)
    await writeFile(page, original.replace('flow.light.svg', 'missing.light.svg'))
    await assert.rejects(checkDocDiagrams(root), /picture light/)
  }))

test('规范伴随页按提取范围核验原围栏，不把尾换行差异当正文变化', () =>
  fixture(async (root) => {
    const path = join(root, 'docs/diagrams/sources.json')
    const manifest = JSON.parse(await readFile(path, 'utf8'))
    const source = await readFile(join(root, 'docs/diagrams/flow.mmd'), 'utf8')
    manifest.diagrams[0].origin = 'docs/norm.md'
    manifest.diagrams[0].originDiagram = 1
    manifest.diagrams[0].originDiagramSha256 = sha(source.trim())
    await writeFile(path, JSON.stringify(manifest))
    await writeFile(join(root, 'docs/norm.md'), `# 规范\n\n\`\`\`mermaid\n${source}\`\`\`\n`)
    assert.deepEqual(await checkDocDiagrams(root), { diagrams: 1, outputs: 2 })
    await writeFile(join(root, 'docs/norm.md'), `\`\`\`mermaid\nflowchart LR\n A-->X\n\`\`\``)
    await assert.rejects(checkDocDiagrams(root), /规范来源图 SHA/)
  }))
