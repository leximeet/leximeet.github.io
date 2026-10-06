import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { thirdPartyNotices } from '../website/.vitepress/third-party-notices.mjs'

async function isolated(run) {
  const root = await mkdtemp(join(tmpdir(), 'leximeet-notice-'))
  try {
    const directory = join(root, 'node_modules', '@example', 'included')
    await mkdir(directory, { recursive: true })
    await writeFile(join(root, 'LICENSE'), '自有许可\n')
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ name: '@example/included', version: '1.0.0', license: 'MIT' }),
    )
    await run(root, directory)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('实际模块原许可去重随包，自有许可独立且不暴露路径', () =>
  isolated(async (root, directory) => {
    await writeFile(join(directory, 'LICENSE'), '上游许可原文\n')
    const emitted = []
    const bundle = {
      code: {
        type: 'chunk',
        modules: { [join(directory, 'index.js')]: {}, [join(directory, 'other.js')]: {} },
      },
    }
    await thirdPartyNotices(root).generateBundle.call(
      { emitFile: (file) => emitted.push(file) },
      { format: 'es' },
      bundle,
    )
    const notice = emitted.find((file) => file.fileName === 'THIRD_PARTY_NOTICES.txt')
    assert.equal(notice.source.match(/@example\/included@1.0.0/g).length, 1)
    assert.match(notice.source, /上游许可原文/)
    assert.ok(!notice.source.includes(root))
    assert.equal(emitted.find((file) => file.fileName === 'LICENSE.txt').source, '自有许可\n')
  }))

test('进入产物但缺原文的依赖阻止发布构建', () =>
  isolated(async (root, directory) => {
    await assert.rejects(
      thirdPartyNotices(root).generateBundle.call(
        { emitFile() {} },
        { format: 'es' },
        {
          code: { type: 'chunk', modules: { [join(directory, 'index.js')]: {} } },
        },
      ),
      /缺少随包许可文本/,
    )
  }))
