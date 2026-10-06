import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLegacyDiagram } from '../website/.vitepress/theme/diagram-source.mjs'
import { assertDiagramSource } from '../website/.vitepress/theme/diagram-theme.mjs'

test('时序 Note 和状态消息的旧 br 保持一行语法，流程标签使用文本换行', () => {
  assert.equal(
    normalizeLegacyDiagram('sequenceDiagram\n Note over A: 权限<br/>回执'),
    'sequenceDiagram\n Note over A: 权限 · 回执',
  )
  assert.equal(
    normalizeLegacyDiagram('%% 说明\nstateDiagram-v2\n A: 权限<br>回执'),
    '%% 说明\nstateDiagram-v2\n A: 权限 · 回执',
  )
  assert.equal(
    normalizeLegacyDiagram('flowchart LR\n A["权限<br/>回执"]'),
    'flowchart LR\n A["权限\n回执"]',
  )
})
test('只有 br 可以规范化，其他 HTML 仍被拒绝', () => {
  assert.throws(() => assertDiagramSource(normalizeLegacyDiagram('flowchart LR\n A[<img src=x>]')))
})
