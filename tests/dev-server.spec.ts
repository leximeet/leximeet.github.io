import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test('npm run dev 冷启动：首页、中文深链、图解和切换主题真正可用', async ({ page }, testInfo) => {
  const errors: string[] = []
  const failures: string[] = []
  const consoleErrors: string[] = []
  const requestFailures: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) =>
    requestFailures.push(`${request.failure()?.errorText} ${request.url()}`),
  )
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  try {
    await page.addInitScript(() => localStorage.setItem('vitepress-theme-appearance', 'light'))
    await page.goto('/')
    await expect(page.locator('.VPHome')).toContainText('词遇')
    await page.screenshot({ path: testInfo.outputPath('dev-home-light.png'), fullPage: true })
    await page.getByRole('link', { name: '了解设计', exact: true }).click()
    await expect(page.locator('.vp-doc h1')).toContainText('系统架构')
    await expect(page.locator('.mermaid svg').first()).toBeVisible()
    await page.reload()
    await expect(page.locator('.mermaid svg').first()).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath('dev-architecture-light.png'),
      fullPage: true,
    })
    const theme = page.locator('.VPSwitchAppearance').first()
    const old = await page.locator('.mermaid svg').first().innerHTML()
    await theme.click()
    await expect.poll(() => page.locator('.mermaid svg').first().innerHTML()).not.toBe(old)
    await page.screenshot({
      path: testInfo.outputPath('dev-architecture-dark.png'),
      fullPage: true,
    })
    await expect(page.locator('.diagram-error')).toHaveCount(0)
    expect(errors).toEqual([])
    expect(failures).toEqual([])
  } finally {
    // 冷启动失败也保存真实模块错误，不让首屏超时掩盖网络或 ESM 互操作原因。
    const diagnostic = testInfo.outputPath('cold-start-diagnostics.json')
    await writeFile(
      diagnostic,
      JSON.stringify(
        { url: page.url(), errors, failures, consoleErrors, requestFailures },
        null,
        2,
      ),
    )
    await testInfo.attach('cold-start-diagnostics', {
      path: diagnostic,
      contentType: 'application/json',
    })
  }
})
