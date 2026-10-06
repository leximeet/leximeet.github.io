import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyDocs } from './verify-docs.mjs'

async function isolated(run) {
  const root = await mkdtemp(join(tmpdir(), 'leximeet-links-'))
  try {
    await mkdir(join(root, 'docs', 'public'), { recursive: true })
    await mkdir(join(root, 'website', '.vitepress'), { recursive: true })
    await writeFile(join(root, 'website', '.vitepress', 'config.mts'), '')
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('中文路径、clean URL、公共图片与JSON来源清单可解析', () =>
  isolated(async (root) => {
    await writeFile(
      join(root, 'docs', 'index.md'),
      '[中文](/使用)\n![界面](/example.png)\n[来源](/sources.json)\n',
    )
    await writeFile(join(root, 'docs', '使用.md'), '# 使用')
    await writeFile(join(root, 'docs', 'public', 'example.png'), 'test')
    await writeFile(join(root, 'docs', 'public', 'sources.json'), '{}')
    assert.equal(await verifyDocs(root), 2)
  }))

test('缺失图片和越界引用不能通过', () =>
  isolated(async (root) => {
    await writeFile(
      join(root, 'docs', 'index.md'),
      '![丢失](/missing.png)\n[不存在的来源](/missing.json)\n[越界](../../private.md)',
    )
    await assert.rejects(verifyDocs(root), /引用不存在[\s\S]*越出根 docs/)
  }))

test('图解不能覆盖全局安全级别', () =>
  isolated(async (root) => {
    await writeFile(
      join(root, 'docs', 'index.md'),
      '```mermaid\n%%{init: {"securityLevel":"loose"}}%%\nflowchart LR\n A-->B\n```',
    )
    await assert.rejects(verifyDocs(root), /不能覆盖安全配置/)
  }))
