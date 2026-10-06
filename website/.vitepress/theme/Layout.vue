<script setup lang="ts">
import DefaultTheme from 'vitepress/theme-without-fonts'
import HomeHeroInfo from './HomeHeroInfo.vue'
import ScreenshotViewer from './ScreenshotViewer.vue'

// 只替换首页介绍插槽，导航、搜索、按钮和正文继续使用官方默认主题。
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #home-hero-info>
      <HomeHeroInfo />
    </template>
  </Layout>
  <ScreenshotViewer />
</template>
