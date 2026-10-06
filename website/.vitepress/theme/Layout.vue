<script setup lang="ts">
import DefaultTheme from 'vitepress/theme-without-fonts'
import HomeHeroInfo from './HomeHeroInfo.vue'
import ScreenshotViewer from './ScreenshotViewer.vue'
import SourceLinks from './SourceLinks.vue'

// 用官方插槽补首页介绍和双平台正文来源；导航、搜索与正文仍由默认主题管理。
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #home-hero-info>
      <HomeHeroInfo />
    </template>
    <template #doc-footer-before>
      <SourceLinks />
    </template>
  </Layout>
  <ScreenshotViewer />
</template>
