import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const directory = new URL('../docs/public/screenshots/', import.meta.url)

test('操作截图与公开来源清单的尺寸和摘要一致，阅读图保留两张原图', async () => {
  const manifest = JSON.parse(await readFile(new URL('usage-demo.sources.json', directory), 'utf8'))
  const files = new Map(manifest.files.map((entry) => [entry.file, entry]))
  assert.equal(files.size, manifest.files.length, '来源不能重复登记同名图片')
  for (const entry of manifest.files) {
    // 清单只检查本仓公开副本，不在 CI 依赖其他工作区，也不能越界读取文件。
    assert.match(entry.file, /^[a-z0-9.-]+\.(?:png|json)$/)
    const data = await readFile(new URL(entry.file, directory))
    assert.equal(data.length, entry.bytes, entry.file)
    assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256, entry.file)
    if (entry.file.endsWith('.png')) {
      assert.equal(data.readUInt32BE(16), entry.width, entry.file)
      assert.equal(data.readUInt32BE(20), entry.height, entry.file)
    } else {
      const pair = JSON.parse(data.toString('utf8'))
      assert.equal(pair.nativeSidePanel, true)
      assert.equal(pair.browserToolbarIncluded, false)
      const stem = entry.file.replace(/\.json$/, '')
      for (const [kind, suffix] of [
        ['reading', '.page.png'],
        ['panel', '.sidepanel.png'],
      ]) {
        const original = files.get(stem + suffix)
        assert.ok(original, `${entry.file} 缺少原始 ${kind} 图`)
        assert.equal(pair[kind].sha256, original.sha256)
        assert.equal(pair[kind].width, original.width)
        assert.equal(pair[kind].height, original.height)
      }
      assert.equal(pair.output.width, pair.reading.width + pair.panel.width)
      assert.equal(files.get(stem + '.png').width, pair.output.width)
    }
  }
})
