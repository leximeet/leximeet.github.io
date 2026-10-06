# 补充原许可

静态构建从实际进入产物的依赖包收集 LICENSE、NOTICE 等原文。少数 npm 包没有单独分发许可文件，这里只补对应上游原文，不改变第三方许可。

| 文件                      | 适用版本                          | 原始来源                                                                         | SHA-256                                                          |
| ------------------------- | --------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| docsearch-3.8.2.txt       | @docsearch/css、js、react 3.8.2   | [官方 v3.8.2 LICENSE](https://github.com/algolia/docsearch/blob/v3.8.2/LICENSE)  | 1e605499213e06118cc81abc00b32bbb33ead185d9b0e190f2662588e8806f02 |
| mermaid-mindmap-9.3.0.txt | @mermaid-js/mermaid-mindmap 9.3.0 | [官方 v9.3.0 LICENSE](https://github.com/mermaid-js/mermaid/blob/v9.3.0/LICENSE) | ec9fb67dcb25eccc416ed56e1aab819222c805a2a4bfe4cb19e7556bf2ffde80 |

fastdom 1.0.12 与 strictdom 1.0.1 的完整 MIT 许可在 npm 随包 README 末尾，构建时原样提取。新版本不会自动套用旧补充文件；升级依赖时必须重新核对并运行构建。

VitePress 使用官方 `theme-without-fonts` 默认主题入口与系统字体，不分发 Inter 字体。实际浏览器产物输出 `THIRD_PARTY_NOTICES.txt` 和自有 `LICENSE.txt`；这两份文本也随 Pages 上传。
