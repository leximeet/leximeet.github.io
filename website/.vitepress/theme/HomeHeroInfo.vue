<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()
const hero = computed(() => frontmatter.value.hero ?? {})
const typingStyle = computed(() => ({
  // 文案仍只维护在docs/index.md；按完整字符计步，不能截断中文或代理对。
  '--typing-steps': Math.max(1, Array.from(hero.value.text ?? '').length),
}))
</script>

<template>
  <h1 class="home-heading">
    <span class="home-name">{{ hero.name }}</span>
    <span class="home-text" :style="typingStyle">
      <!-- 静态占位让逐字出现时布局不动；读屏器始终只读取一份完整句子。 -->
      <span class="home-sr-only">{{ hero.text }}</span>
      <span class="home-text-space" aria-hidden="true">{{ hero.text }}</span>
      <span class="home-text-typed" aria-hidden="true">{{ hero.text }}</span>
    </span>
  </h1>
  <p v-if="hero.tagline" class="home-tagline">{{ hero.tagline }}</p>
</template>

<style scoped>
.home-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0;
}

.home-name {
  color: var(--vp-c-brand-1);
  font-size: 28px;
  font-weight: 650;
  line-height: 1.4;
}

.home-text {
  position: relative;
  width: max-content;
  max-width: 100%;
  margin-top: 12px;
  color: var(--vp-c-text-1);
  font-size: clamp(24px, 6.4vw, 48px);
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.home-text-space {
  visibility: hidden;
}

.home-text-typed {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* 只播放一次，不使用计时器或逐帧改写正文，也不依赖客户端挂载才开始隐藏。 */
  animation: home-type 1.4s steps(var(--typing-steps), end) 0.15s both;
}

.home-text-typed::after {
  position: absolute;
  top: 0.14em;
  right: 0;
  width: 2px;
  height: 0.95em;
  background: var(--vp-c-brand-1);
  content: '';
  animation: home-caret 1.4s step-end 0.15s both;
}

.home-tagline {
  margin: 20px 0 0;
  color: var(--vp-c-text-2);
  font-size: 20px;
  line-height: 1.6;
}

.home-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes home-type {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

@keyframes home-caret {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-text-typed {
    width: 100%;
    animation: none;
  }

  .home-text-typed::after {
    display: none;
    animation: none;
  }
}
</style>
