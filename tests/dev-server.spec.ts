import { test, expect } from '@playwright/test'

test('npm run dev 冷启动：首页、中文深链、图解和切换主题真正可用', async ({ page }, testInfo) => {
  const errors: string[] = []
  const failures: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  await page.addInitScript(() => localStorage.setItem('vitepress-theme-appearance', 'light'))
  await page.goto('/')
  await expect(page.locator('.VPHome')).toContainText('词遇')
  await page.screenshot({ path: testInfo.outputPath('dev-home-light.png'), fullPage: true })
  await page.getByRole('link', { name: '了解设计', exact: true }).click()
  await expect(page.locator('.vp-doc h1')).toContainText('系统架构')
  await expect(page.locator('.mermaid svg').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('.mermaid svg').first()).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dev-architecture-light.png'), fullPage: true })
  const theme = page.locator('.VPSwitchAppearance').first()
  const old = await page.locator('.mermaid svg').first().innerHTML()
  await theme.click()
  await expect.poll(() => page.locator('.mermaid svg').first().innerHTML()).not.toBe(old)
  await page.screenshot({ path: testInfo.outputPath('dev-architecture-dark.png'), fullPage: true })
  await expect(page.locator('.diagram-error')).toHaveCount(0)
  expect(errors).toEqual([])
  expect(failures).toEqual([])
})
