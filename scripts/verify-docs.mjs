import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// 检查仓内引用，不抓取外网，也不读取工作区历史资料。
export async function verifyDocs(root) {
  const docs = join(root, 'docs')
  const files = []
  const issues = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'public') continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
    }
  }
  await walk(docs)

  async function checkTarget(owner, raw, image = false) {
    const link = raw.trim().replace(/^<|>$/g, '')
    if (!link || /^(?:https?:|mailto:|#)/i.test(link)) return
    let target
    try {
      target = decodeURIComponent(link.split(/[?#]/, 1)[0])
    } catch {
      issues.push(`${owner}: 链接编码无效 ${raw}`)
      return
    }
    const absolute = target.startsWith('/')
      ? join(docs, image ? 'public' : '', target.slice(1))
      : resolve(dirname(owner), target)
    if (!absolute.startsWith(`${docs}${sep}`) && absolute !== docs) {
      issues.push(`${owner}: 链接越出根 docs ${raw}`)
      return
    }
    const candidates =
      image || extname(absolute) ? [absolute] : [absolute + '.md', join(absolute, 'index.md')]
    // public 的 JSON 来源清单等下载资源也使用根 URL，不能误当正文路由。
    if (!image && target.startsWith('/') && extname(target) && extname(target) !== '.md') {
      candidates.push(join(docs, 'public', target.slice(1)))
    }
    const found = await Promise.all(
      candidates.map((path) =>
        stat(path)
          .then((s) => s.isFile())
          .catch(() => false),
      ),
    )
    if (!found.some(Boolean)) issues.push(`${owner}: 引用不存在 ${raw}`)
  }

  for (const file of files) {
    const markdown = await readFile(file, 'utf8')
    if (/[/]Users[/][^/\s]+[/]|file:\/\/|(?:^|[(/])dcs\//m.test(markdown)) {
      issues.push(`${file}: 含个人绝对路径或私有过程文档引用`)
    }
    for (const match of markdown.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      await checkTarget(file, match[2], Boolean(match[1]))
    }
    // 首页 frontmatter 的站内入口和图片也必须有实体来源。
    for (const match of markdown.matchAll(/^\s+(link|src|light|dark):\s*(\/\S+)\s*$/gm)) {
      await checkTarget(file, match[2], match[1] !== 'link')
    }
    for (const match of markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)) {
      if (/%%\{\s*init|^\s*click\s|<script|javascript:|securityLevel/im.test(match[1])) {
        issues.push(`${file}: Mermaid 不能覆盖安全配置或包含可执行内容`)
      }
    }
  }
  const config = await readFile(join(root, 'website', '.vitepress', 'config.mts'), 'utf8')
  for (const match of config.matchAll(/link:\s*'(\/[^']+)'/g)) {
    await checkTarget(join(docs, 'index.md'), match[1])
  }
  if (issues.length) throw new Error(issues.join('\n'))
  return files.length
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  console.log(`文档引用检查通过：${await verifyDocs(root)} 页`)
}
