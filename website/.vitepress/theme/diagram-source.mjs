// 旧图的 br 只是换行提示；时序消息必须保持一条语法行，不能直接插入换行。
export function normalizeLegacyDiagram(source) {
  const first =
    source.split(/\r?\n/).find((line) => line.trim() && !line.trim().startsWith('%%')) || ''
  const inline = /^\s*(?:sequenceDiagram|stateDiagram(?:-v2)?)\b/.test(first)
  return source.replace(/<br\s*\/?\s*>/gi, inline ? ' · ' : '\n')
}
