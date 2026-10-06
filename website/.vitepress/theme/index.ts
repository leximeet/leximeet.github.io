import DefaultTheme from 'vitepress/theme-without-fonts'
import LexiMeetDiagram from './LexiMeetDiagram.vue'
import Layout from './Layout.vue'
import './style.css'

// 使用官方默认主题，只补品牌色和图表排版，不替换导航或阅读组件。
export default {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('LexiMeetDiagram', LexiMeetDiagram)
  },
}
