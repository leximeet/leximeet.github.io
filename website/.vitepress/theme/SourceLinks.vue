<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { page, frontmatter } = useData()
// 从当前正文路径生成两份平级入口，中文按路径段编码，页面切换后自动更新。
const sourcePath = computed(() =>
  page.value.relativePath.split('/').map(encodeURIComponent).join('/'),
)
const platforms = [
  { name: 'GitHub', base: 'https://github.com/leximeet/leximeet.github.io/blob/main/docs/' },
  { name: 'Gitee', base: 'https://gitee.com/leximeet/leximeet.github.io/blob/main/docs/' },
]
</script>

<template>
  <nav
    v-if="sourcePath && frontmatter.editLink !== false"
    class="source-links"
    aria-label="本页源码与修改入口"
  >
    <span>本页源码</span>
    <a
      v-for="platform in platforms"
      :key="platform.name"
      :href="platform.base + sourcePath"
      target="_blank"
      rel="noreferrer"
      >{{ platform.name }}</a
    >
  </nav>
</template>

<style scoped>
.source-links {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
  margin-top: 32px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}
.source-links a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
