<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()
const dialog = ref<HTMLDialogElement>()
const selected = ref<{ src: string; alt: string }>()
let origin: HTMLImageElement | undefined
let previousOverflow = ''
let locked = false
let opening = false

// 只增强正文的本地产品截图，图解、品牌和已有图片链接保持原有语义。
function screenshot(target: EventTarget | null) {
  if (!(target instanceof HTMLImageElement)) return
  const path = new URL(target.currentSrc || target.src, location.href)
  if (path.origin !== location.origin || !path.pathname.startsWith('/screenshots/')) return
  if (!target.closest('.vp-doc') || target.closest('a')) return
  return target
}

function decorate() {
  document.querySelectorAll<HTMLImageElement>('.vp-doc img').forEach((image) => {
    if (!screenshot(image)) return
    image.classList.add('doc-screenshot')
    image.tabIndex = 0
    image.setAttribute('role', 'button')
    image.setAttribute('aria-haspopup', 'dialog')
    image.setAttribute('aria-label', `放大截图：${image.alt || '使用演示'}`)
    image.title = '点击或按 Enter 放大'
  })
}

async function open(image: HTMLImageElement) {
  if (!dialog.value || dialog.value.open || opening) return
  // Esc 的原生 close 事件可能还在排队；新预览不能继承上次的滚动锁。
  if (locked) release()
  opening = true
  origin = image
  selected.value = { src: image.currentSrc || image.src, alt: image.alt || '使用演示' }
  await nextTick()
  opening = false
  if (!dialog.value || !selected.value || !origin?.isConnected) return
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  locked = true
  dialog.value.showModal()
}

function onClick(event: MouseEvent) {
  const image = screenshot(event.target)
  if (image) void open(image)
}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const image = screenshot(event.target)
  if (!image) return
  event.preventDefault()
  void open(image)
}

function release() {
  if (locked) document.body.style.overflow = previousOverflow
  locked = false
  selected.value = undefined
  if (origin?.isConnected) origin.focus({ preventScroll: true })
  origin = undefined
}

function close() {
  dialog.value?.close()
  release()
}

function onClosed() {
  // 快速重新打开时，旧的 close 事件不能清空新截图。
  if (!dialog.value?.open) release()
}

function backdrop(event: MouseEvent) {
  const modal = dialog.value
  if (!modal || event.target !== modal) return
  const bounds = modal.getBoundingClientRect()
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    close()
}

onMounted(() => {
  decorate()
  document.addEventListener('click', onClick)
  document.addEventListener('keydown', onKey)
})

watch(
  () => page.value.relativePath,
  async () => {
    // 后退或切文档时结束预览，避免旧截图遮住新正文并锁住滚动。
    origin = undefined
    close()
    await nextTick()
    decorate()
  },
)

onBeforeUnmount(() => {
  close()
  release()
  document.removeEventListener('click', onClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="screenshot-viewer"
      aria-label="截图预览"
      @close="onClosed"
      @cancel.prevent="close"
      @click="backdrop"
    >
      <header>
        <span>{{ selected?.alt }}</span>
        <button type="button" autofocus aria-label="关闭截图预览" @click="close">关闭</button>
      </header>
      <img v-if="selected" :src="selected.src" :alt="selected.alt" />
    </dialog>
  </Teleport>
</template>

<style scoped>
.screenshot-viewer {
  width: min(1440px, 94vw);
  max-width: 94vw;
  max-height: 92vh;
  margin: auto;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}
.screenshot-viewer::backdrop {
  background: rgb(0 0 0 / 65%);
}
header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 14px;
}
header span {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}
button {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
img {
  display: block;
  max-width: 100%;
  max-height: calc(92vh - 104px);
  width: auto;
  height: auto;
  margin: auto;
  object-fit: contain;
}
</style>
