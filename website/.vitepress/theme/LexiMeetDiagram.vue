<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { assertDiagramSource, diagramConfig } from './diagram-theme.mjs'
import { normalizeLegacyDiagram } from './diagram-source.mjs'

const props = defineProps<{ source: string }>()
const { isDark } = useData()
const svg = ref('')
const error = ref('')
let mounted = false
let revision = 0

// Mermaid 的初始化是全局状态，渲染串行化避免相邻图或切换主题互相覆盖。
async function update() {
  const current = ++revision
  try {
    const source = assertDiagramSource(normalizeLegacyDiagram(decodeURIComponent(props.source)))
    const dark = isDark.value
    const result = await enqueueDiagram(source, dark)
    if (mounted && current === revision) {
      svg.value = result
      error.value = ''
    }
  } catch {
    if (mounted && current === revision) error.value = '图解暂时无法显示，请查看正文或反馈此页。'
  }
}
onMounted(() => {
  mounted = true
  void update()
})
watch([() => props.source, isDark], () => {
  if (mounted) void update()
})
onBeforeUnmount(() => {
  mounted = false
  revision++
})
</script>

<script lang="ts">
let sequence = 0
let queue: Promise<unknown> = Promise.resolve()
function enqueueDiagram(source: string, dark: boolean): Promise<string> {
  const task = queue.then(async () => {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize(diagramConfig(dark))
    const { svg } = await mermaid.render(`leximeet-diagram-${++sequence}`, source)
    return svg
  })
  queue = task.catch(() => undefined)
  return task
}
</script>

<template>
  <div class="mermaid" role="img" aria-label="正文流程图">
    <p v-if="error" class="diagram-error" role="alert">{{ error }}</p>
    <!-- SVG 仅来自本地 Mermaid strict 渲染，不接受原始 HTML。 -->
    <div v-else v-html="svg"></div>
  </div>
</template>
