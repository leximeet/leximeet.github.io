import { defineConfig } from 'vitepress'
import { diagramFence } from './diagram-fence.mjs'
import { thirdPartyNotices } from './third-party-notices.mjs'

const product = [
  { text: '词遇是什么', link: '/产品文档/词遇是什么' },
  { text: '版本与路线', link: '/产品文档/版本与路线' },
]
const usage = [
  { text: '快速开始', link: '/使用文档/快速开始' },
  { text: '桌面端', link: '/使用文档/桌面端' },
  { text: '浏览器插件', link: '/使用文档/浏览器插件' },
  { text: '学习规划与练习', link: '/使用文档/学习规划与练习' },
  { text: '连接桌面', link: '/使用文档/插件连接' },
  { text: '采集与隐私', link: '/使用文档/采集与隐私' },
  { text: '词典与发音', link: '/使用文档/词典与发音' },
  { text: '常见问题', link: '/使用文档/常见问题' },
]
const development = [
  { text: '开发入口', link: '/开发文档/开发入口' },
  { text: '环境与联调', link: '/开发文档/环境与联调' },
  { text: '测试与质量', link: '/开发文档/测试与质量' },
  { text: '发布与版本管理', link: '/开发文档/发布与版本管理' },
  { text: '贡献指南', link: '/开发文档/贡献指南' },
  { text: '维护文档站', link: '/开发文档/维护文档站' },
]
const design = [
  { text: '系统架构', link: '/设计文档/系统架构' },
  { text: '功能设计', link: '/设计文档/功能设计' },
  { text: '部署与扩展', link: '/设计文档/部署与扩展' },
  { text: '数据与学习规则', link: '/设计文档/数据与学习规则' },
  { text: '连接协议', link: '/设计文档/连接协议' },
  { text: '图表规范', link: '/设计文档/图表规范' },
  { text: '隐私与许可', link: '/设计文档/隐私与许可' },
]
const projects = [
  { text: 'Desktop', link: '/项目文档/leximeet-desktop/' },
  { text: 'Desktop Core', link: '/项目文档/leximeet-desktop-core/' },
  { text: 'Browser', link: '/项目文档/leximeet-browser/' },
  { text: 'Dictionary', link: '/项目文档/leximeet-dictionary/' },
  { text: 'LMCP', link: '/项目文档/leximeet-connector-protocol/' },
  { text: 'LMSP 规划', link: '/项目文档/leximeet-sync-protocol/' },
  { text: 'IDEA 预留', link: '/项目文档/leximeet-idea/' },
]

export default defineConfig({
  lang: 'zh-CN',
  title: '词遇 LexiMeet',
  description: '在语境中遇见单词，在练习中留下记忆。词遇的产品、使用、开发与设计文档。',
  // dev/build/serve 均以 website 为根；docs 是准备脚本验证的唯一正文入口。
  srcDir: './docs',
  outDir: '.vitepress/dist',
  cacheDir: process.env.LEXIMEET_DOCS_CACHE_DIR || '.vitepress/cache',
  base: '/',
  cleanUrls: true,
  appearance: true,
  lastUpdated: false,
  ignoreDeadLinks: false,
  // 保留唯一正文入口；明确预构建 Mermaid 的嵌套 CommonJS，避免 dev 白屏。
  vite: {
    resolve: { preserveSymlinks: true },
    optimizeDeps: { include: ['mermaid > fastdom'] },
    plugins: [thirdPartyNotices()],
  },
  markdown: { config: (md) => diagramFence(md) },
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/brand/icon.png' }],
    ['meta', { name: 'theme-color', content: '#087f71' }],
  ],
  themeConfig: {
    logo: { light: '/brand/logo-light.png', dark: '/brand/logo-dark.png', alt: '词遇 LexiMeet' },
    siteTitle: false,
    nav: [
      { text: '产品', link: product[0].link, activeMatch: '/产品文档/' },
      { text: '使用', link: usage[0].link, activeMatch: '/使用文档/' },
      { text: '开发', link: development[0].link, activeMatch: '/开发文档/' },
      { text: '设计', link: design[0].link, activeMatch: '/设计文档/' },
      { text: '项目', items: projects, activeMatch: '/项目文档/' },
    ],
    sidebar: [
      { text: '了解词遇', items: product },
      { text: '开始使用', items: usage },
      { text: '参与开发', collapsed: true, items: development },
      { text: '设计与架构', collapsed: true, items: design },
      { text: '各项目', collapsed: true, items: projects },
    ],
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    editLink: {
      pattern: 'https://github.com/leximeet/leximeet.github.io/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/leximeet' }],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索词遇文档' },
              modal: {
                noResultsText: '没有找到结果',
                displayDetails: '显示详细结果',
                resetButtonTitle: '重置搜索',
                backButtonTitle: '关闭搜索',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
    darkModeSwitchLabel: '主题',
    darkModeSwitchTitle: '切换到深色模式',
    lightModeSwitchTitle: '切换到浅色模式',
    sidebarMenuLabel: '文档目录',
    returnToTopLabel: '回到顶部',
    skipToContentLabel: '跳转到正文',
    footer: { message: '自有代码与文档使用 AGPL-3.0-only；词典数据和第三方素材保留原许可。' },
  },
})
