import { lstat, mkdir, realpath, symlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

// 只建立正文入口；真实目录或指向其他资料的链接一律拒绝，不删除或覆盖。
export async function prepareDocs(root) {
  const source = join(root, 'docs')
  const target = join(root, 'website', 'docs')
  const sourceInfo = await lstat(source)
  if (!sourceInfo.isDirectory() || sourceInfo.isSymbolicLink()) {
    throw new Error('根 docs 必须是本仓真实目录')
  }
  await mkdir(join(root, 'website'), { recursive: true })
  let existing
  try {
    existing = await lstat(target)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (existing) {
    if (!existing.isSymbolicLink() || (await realpath(target)) !== (await realpath(source))) {
      throw new Error('website/docs 已存在且不是指向本仓根 docs 的软链接，请人工核对')
    }
    return target
  }
  await symlink(
    process.platform === 'win32' ? source : '../docs',
    target,
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  return target
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  await prepareDocs(root)
  console.log('正文入口就绪：website/docs → ../docs')
}
