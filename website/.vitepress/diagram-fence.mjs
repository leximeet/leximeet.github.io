import { assertDiagramSource } from './theme/diagram-theme.mjs'
import { normalizeLegacyDiagram } from './theme/diagram-source.mjs'

// 只接管 mermaid 围栏；其他 Markdown 仍使用官方默认渲染器。
export function diagramFence(md) {
  const fallback = md.renderer.rules.fence.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index]
    if (token.info.trim() !== 'mermaid') return fallback(tokens, index, options, env, self)
    assertDiagramSource(normalizeLegacyDiagram(token.content))
    // URI 编码不依赖浏览器 Buffer，属性转义避免正文变成 Vue 模板。
    const encoded = md.utils.escapeHtml(encodeURIComponent(token.content))
    return `<LexiMeetDiagram source="${encoded}" />\n`
  }
}
