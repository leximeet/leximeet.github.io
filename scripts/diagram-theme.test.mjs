import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diagramConfig,
  diagramTokens,
  assertDiagramSource,
} from '../website/.vitepress/theme/diagram-theme.mjs'
import { diagramFence } from '../website/.vitepress/diagram-fence.mjs'

test('官网和静态导出共用参考配色、严格安全和自然大小', () => {
  assert.equal(diagramTokens.light.node, '#E4F2FF')
  assert.equal(diagramTokens.light.text, '#0059B3')
  for (const dark of [false, true]) {
    const config = diagramConfig(dark)
    assert.equal(config.securityLevel, 'strict')
    assert.equal(config.startOnLoad, false)
    assert.equal(config.flowchart.htmlLabels, false)
    assert.equal(config.flowchart.useMaxWidth, false)
    assert.equal(config.themeVariables.darkMode, dark)
    assert.equal(config.themeVariables.primaryColor, diagramTokens[dark ? 'dark' : 'light'].node)
  }
})
test('标准 Mermaid 可以使用，局部配置、HTML、脚本与颜色覆盖不能进入图', () => {
  assertDiagramSource('flowchart LR\n A(安全文本):::decision --> B[保存]')
  for (const invalid of [
    '%%{init:{}}%%',
    'flowchart LR\n click A href "https://example.com"',
    'flowchart LR\n A[<script>]',
    'flowchart LR\n classDef custom fill:red',
    '---\nconfig: {}',
  ])
    assert.throws(() => assertDiagramSource(invalid))
})
test('围栏只接管 Mermaid，单引号等内容不会变成 Vue 属性代码', () => {
  const md = {
    renderer: { rules: { fence: () => 'official-code' } },
    utils: { escapeHtml: (s) => s.replaceAll('"', '&quot;').replaceAll("'", '&#39;') },
  }
  diagramFence(md)
  assert.equal(md.renderer.rules.fence([{ info: 'java' }], 0), 'official-code')
  const rendered = md.renderer.rules.fence(
    [{ info: 'mermaid', content: 'flowchart LR\n A["用户\'s"]' }],
    0,
  )
  assert.match(rendered, /^<LexiMeetDiagram source="/)
  assert.ok(!rendered.includes("用户's"))
})
