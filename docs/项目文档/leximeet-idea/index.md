# LexiMeet IDEA（预留）

[GitHub 仓库](https://github.com/leximeet/leximeet-idea) · [Gitee 仓库](https://gitee.com/leximeet/leximeet-idea)

IDEA 仓库当前是插件工程模板与后续接入预留。尚未提供可验收的词遇阅读、采集和桌面连接业务，不应把模板的构建配置、Marketplace 占位符或示例界面当作已发布功能。

## 后续接入方向

- 在编辑器阅读场景中展示词卡与发音入口。
- 从用户明确选择的单词与代码注释采集语境。
- 使用 LMCP 连接桌面工作区；IDE 特有功能通过独立能力接口报告。
- 使用插件自身弹窗与输入，避免覆盖用户文档、选择、撤销记录或输入法状态。
- 在隔离 IDE 配置中验证插件，不影响日常 IDE 工作区。

IDEA 与浏览器的能力不同，复用协议和领域规则不等于复制浏览器交互。具体独立运行范围、快捷键和编辑器权限需要在这一阶段设计并验收。

- [工程仓库](https://github.com/leximeet/leximeet-idea)
- [连接协议](../../设计文档/连接协议.md)
- [版本与路线](../../产品文档/版本与路线.md)
