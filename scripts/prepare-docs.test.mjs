import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareDocs } from './prepare-docs.mjs'

async function isolated(run) {
  const root = await mkdtemp(join(tmpdir(), 'leximeet-docs-'))
  try {
    await mkdir(join(root, 'docs'))
    await mkdir(join(root, 'website'))
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('首次建立软链接，重复准备不会复制或改写正文', () =>
  isolated(async (root) => {
    await writeFile(join(root, 'docs', 'index.md'), '# 词遇\n')
    const target = await prepareDocs(root)
    assert.equal(await realpath(target), await realpath(join(root, 'docs')))
    assert.equal(await prepareDocs(root), target)
    assert.equal(await readFile(join(target, 'index.md'), 'utf8'), '# 词遇\n')
  }))

test('拒绝真实入口目录，不删除其中资料', () =>
  isolated(async (root) => {
    await mkdir(join(root, 'website', 'docs'))
    await assert.rejects(prepareDocs(root), /不是指向/)
  }))

test('拒绝指向其他目录的软链接', () =>
  isolated(async (root) => {
    await mkdir(join(root, 'other'))
    await symlink(
      join(root, 'other'),
      join(root, 'website', 'docs'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    await assert.rejects(prepareDocs(root), /不是指向/)
  }))

test('根 docs 不能是指向仓外正文的软链接', () =>
  isolated(async (root) => {
    await rm(join(root, 'docs'), { recursive: true })
    await mkdir(join(root, 'other'))
    await symlink(
      join(root, 'other'),
      join(root, 'docs'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    await assert.rejects(prepareDocs(root), /必须是本仓真实目录/)
  }))
