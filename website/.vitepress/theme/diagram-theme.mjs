// 官网与各仓 SVG 共用的语义配色；不要在单张图里覆写视觉或安全级别。
export const diagramTokens = Object.freeze({
  light: Object.freeze({
    node: '#E4F2FF',
    text: '#0059B3',
    border: '#D1DCE8',
    line: '#8B99A8',
    label: '#F5FAFF',
    surface: '#FFFFFF',
    cluster: '#F8FBFE',
  }),
  dark: Object.freeze({
    node: '#203A53',
    text: '#C2E2FF',
    border: '#49637B',
    line: '#A0AFBF',
    label: '#24394B',
    surface: '#1B1B1F',
    cluster: '#20272F',
  }),
})

export function assertDiagramSource(source) {
  if (typeof source !== 'string' || !source.trim() || source.length > 50_000)
    throw new Error('图表正文为空或超过 50 KB')
  // 图只负责解释流程。禁止作者通过指令、HTML、链接或局部 CSS 绕开统一设置。
  if (/%%\{|^\s*(?:click|style|classDef|linkStyle)\s|<\/?[a-z]|javascript:|^---/im.test(source))
    throw new Error('图表含局部配置、HTML、脚本或样式；请使用标准文本节点')
  return source
}

export function diagramConfig(dark = false) {
  const color = diagramTokens[dark ? 'dark' : 'light']
  return {
    securityLevel: 'strict',
    startOnLoad: false,
    htmlLabels: false,
    theme: 'base',
    secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize'],
    maxTextSize: 50_000,
    deterministicIds: true,
    deterministicIDSeed: 'leximeet',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    themeVariables: {
      darkMode: dark,
      background: color.surface,
      fontSize: '15px',
      primaryColor: color.node,
      primaryTextColor: color.text,
      primaryBorderColor: color.border,
      secondaryColor: color.node,
      secondaryTextColor: color.text,
      secondaryBorderColor: color.border,
      tertiaryColor: color.cluster,
      tertiaryTextColor: color.text,
      tertiaryBorderColor: color.border,
      lineColor: color.line,
      textColor: color.text,
      edgeLabelBackground: color.label,
      clusterBkg: color.cluster,
      clusterBorder: color.border,
      actorBkg: color.node,
      actorBorder: color.border,
      actorTextColor: color.text,
      actorLineColor: color.line,
      signalColor: color.line,
      signalTextColor: color.text,
      labelBoxBkgColor: color.label,
      labelBoxBorderColor: color.border,
      labelTextColor: color.text,
      noteBkgColor: color.label,
      noteBorderColor: color.border,
      noteTextColor: color.text,
    },
    flowchart: { htmlLabels: false, curve: 'linear', useMaxWidth: false, padding: 16 },
    sequence: { useMaxWidth: false, mirrorActors: false },
    er: { useMaxWidth: false },
    themeCSS: `
      .node rect, rect.actor { rx: 10px; ry: 10px; stroke-width: 1px; }
      .node.decision rect, .node.decision polygon { stroke-dasharray: 5 4; }
      .flowchart-link, .messageLine0, .messageLine1 { stroke-width: 1px; }
      .edgeLabel rect { rx: 7px; ry: 7px; fill: ${color.label}; stroke: ${color.border}; stroke-width: 1px; }
      .edgeLabel text, .label text, text.actor { font-weight: 600; }
    `,
  }
}
