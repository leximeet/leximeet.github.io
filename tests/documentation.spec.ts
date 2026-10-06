import { test, expect } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

for (const appearance of ['light', 'dark']) {
  test(`使用指南截图记录：${appearance}主题宽屏与手机`, async ({ page }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem('vitepress-theme-appearance', value),
      appearance,
    )
    const output = process.env.LEXIMEET_DOCS_VISUAL
    if (output) await mkdir(output, { recursive: true })
    for (const [name, route] of [
      ['browser', '/使用文档/浏览器插件'],
      ['desktop', '/使用文档/桌面端'],
    ]) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.goto(route)
        await expect(page.locator('.vp-doc h1')).toBeVisible()
        await expect
          .poll(() =>
            page
              .locator('.vp-doc img')
              .evaluateAll((images) =>
                images.every(
                  (image) =>
                    (image as HTMLImageElement).complete &&
                    (image as HTMLImageElement).naturalWidth > 0,
                ),
              ),
          )
          .toBe(true)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        )
        const filename = `${name}-${appearance}-${width}.png`
        await page.screenshot({
          path: output ? join(output, filename) : testInfo.outputPath(filename),
          fullPage: true,
        })
      }
    }
  })
}

type HomeAnimationTrace = {
  samples: { width: number; bottom: number; featuresTop: number }[]
  fullWidth: number
  finalWidth: number
  caretOpacity: string
  done: boolean
}

test('首页一次打字保留完整标题语义，动画期间布局不跳动', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const trace: HomeAnimationTrace = {
      samples: [],
      fullWidth: 0,
      finalWidth: 0,
      caretOpacity: '',
      done: false,
    }
    Object.assign(window, { __leximeetHomeTrace: trace })
    let started: number | undefined
    const deadline = performance.now() + 10_000
    // 从首次绘制起测量真实动画，不能等load后才开始，或重新启动动画掩盖慢CI。
    const sample = (now: number) => {
      const element = document.querySelector('.home-text') as HTMLElement | null
      const typed = element?.querySelector('.home-text-typed') as HTMLElement | null
      const reserve = element?.querySelector('.home-text-space') as HTMLElement | null
      const features = document.querySelector('.VPHomeFeatures') as HTMLElement | null
      if (
        element &&
        typed &&
        reserve &&
        features &&
        getComputedStyle(typed).animationName !== 'none'
      ) {
        started ??= now
        trace.samples.push({
          width: typed.getBoundingClientRect().width,
          bottom: element.getBoundingClientRect().bottom,
          featuresTop: features.getBoundingClientRect().top,
        })
        trace.fullWidth = reserve.getBoundingClientRect().width
        trace.finalWidth = typed.getBoundingClientRect().width
        trace.caretOpacity = getComputedStyle(typed, '::after').opacity
      }
      trace.done = (started !== undefined && now - started >= 1900) || now >= deadline
      if (!trace.done) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: /词遇 LexiMeet.*记录单词，积累语境/ }),
  ).toBeVisible()
  await page.waitForFunction(
    () =>
      (window as unknown as { __leximeetHomeTrace: HomeAnimationTrace }).__leximeetHomeTrace.done,
  )
  const result = await page.evaluate(
    () => (window as unknown as { __leximeetHomeTrace: HomeAnimationTrace }).__leximeetHomeTrace,
  )
  expect(
    result.samples.some((sample) => sample.width > 0 && sample.width < result.fullWidth - 1),
  ).toBe(true)
  expect(Math.abs(result.finalWidth - result.fullWidth)).toBeLessThan(1)
  expect(result.caretOpacity).toBe('0')
  for (const key of ['bottom', 'featuresTop'] as const) {
    const values = result.samples.map((sample) => sample[key])
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(0.5)
  }
  await expect(page.locator('.VPHome')).not.toContainText('不会强迫')
  await expect(page.locator('.VPHome')).not.toContainText('两个职责清楚分开')
  await page.getByRole('link', { name: '开始使用', exact: true }).click()
  await expect(page.locator('.vp-doc h1')).toHaveText('快速开始')
  expect(errors).toEqual([])
})

for (const appearance of ['light', 'dark']) {
  test(`首页精简入口与${appearance}主题，320至1320宽度不溢出`, async ({ page }, testInfo) => {
    await page.addInitScript(
      (value) => localStorage.setItem('vitepress-theme-appearance', value),
      appearance,
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    for (const width of [320, 390, 1107, 1320]) {
      await page.setViewportSize({ width, height: 1060 })
      await expect(page.getByRole('heading', { level: 2, name: /^常用文档/ })).toBeVisible()
      const size = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }))
      expect(size.document, `${appearance} ${width}`).toBeLessThanOrEqual(size.viewport)
      if (width === 390 || width === 1320) {
        await page.screenshot({
          path: testInfo.outputPath(`home-${appearance}-${width}.png`),
          fullPage: true,
        })
      }
    }
    for (const name of ['桌面端使用', '插件使用', '开发文档', '插件连接', '版本与路线']) {
      // 官方卡片把正文放在 article 内，按卡片真实可见文本定位整个链接。
      await expect(
        page.locator('.VPHome').getByRole('link').filter({ hasText: name }),
      ).toBeVisible()
    }
  })
}

test('减少动态效果即时显示全文，纯静态页面仍有完整介绍和文档入口', async ({ browser, baseURL }) => {
  // 独立资料且禁用JS，证明首页不是靠客户端动画填充才有正文。
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  })
  try {
    const page = await context.newPage()
    await page.goto('/')
    const title = page.locator('.home-text-typed')
    await expect(title).toHaveText('记录单词，积累语境。')
    const style = await title.evaluate((element) => ({
      animation: getComputedStyle(element).animationName,
      width: element.getBoundingClientRect().width,
      full: element.parentElement!.getBoundingClientRect().width,
      caret: getComputedStyle(element, '::after').display,
    }))
    expect(style.animation).toBe('none')
    expect(Math.abs(style.width - style.full)).toBeLessThan(1)
    expect(style.caret).toBe('none')
    await page.getByRole('link', { name: '开始使用', exact: true }).click()
    await expect(page.locator('.vp-doc h1')).toHaveText('快速开始')
  } finally {
    await context.close()
  }
})

async function articles(
  directory: string,
  prefix = '',
): Promise<{ route: string; diagrams: number }[]> {
  const result: { route: string; diagrams: number }[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'public') continue
    const path = join(directory, entry.name)
    const relative = `${prefix}/${entry.name}`
    if (entry.isDirectory()) result.push(...(await articles(path, relative)))
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      const markdown = await readFile(path, 'utf8')
      result.push({
        route: relative.replace(/index\.md$/, '').replace(/\.md$/, ''),
        diagrams: [...markdown.matchAll(/```mermaid/g)].length,
      })
    }
  }
  return result
}

for (const dark of [false, true]) {
  test(`全部正文可直达，${dark ? '深' : '浅'}色图解渲染且没有页面错误`, async ({ page }) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const pages = await articles(join(process.cwd(), 'docs'))
    await page.addInitScript(
      (value) => localStorage.setItem('vitepress-theme-appearance', value),
      dark ? 'dark' : 'light',
    )
    for (const article of pages) {
      const response = await page.goto(article.route)
      expect(response?.status(), article.route).toBe(200)
      await expect(page.locator('.VPContent')).toBeVisible()
      await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*dark).*$/)
      await expect(page.locator('.mermaid svg')).toHaveCount(article.diagrams)
      await expect(page.getByText('Syntax error in text', { exact: false })).toHaveCount(0)
    }
    expect(errors).toEqual([])
  })
}

test('本地搜索可打开对应正文，主题切换可见', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '搜索词遇文档' }).click()
  await page.getByPlaceholder('搜索文档').fill('FSRS')
  const result = page.getByRole('option').filter({ hasText: '学习' }).first()
  await expect(result).toBeVisible()
  await result.click()
  await expect(page.locator('.vp-doc')).toContainText('FSRS')
  const theme = page.locator('.VPSwitchAppearance').first()
  const before = await page.locator('html').getAttribute('class')
  await theme.click()
  await expect.poll(() => page.locator('html').getAttribute('class')).not.toBe(before)
})

test('移动导航与正文不横向溢出，宽图在自身容器中滚动', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/设计文档/系统架构')
  await expect(page.locator('.mermaid svg').first()).toBeVisible()
  const diagram = await page
    .locator('.mermaid svg')
    .first()
    .evaluate((element) => ({
      actual: element.getBoundingClientRect().width,
      natural: (element as SVGSVGElement).viewBox.baseVal.width,
    }))
  // 宽图保留自然字号并在图容器滚动，不能压成手机上的微型文字。
  expect(diagram.actual).toBeGreaterThanOrEqual(diagram.natural * 0.95)
  const width = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(width.document).toBeLessThanOrEqual(width.viewport)
  await page.getByRole('button', { name: 'mobile navigation' }).click()
  await expect(page.locator('.VPNavScreen')).toBeVisible()
  await page.locator('.VPNavScreen').getByRole('link', { name: '使用', exact: true }).click()
  await expect.poll(() => decodeURIComponent(page.url())).toContain('快速开始')
  await expect(page.locator('.vp-doc h1')).toContainText('快速开始')
})

test('图表采用共享明暗配色和圆角判断，保留自然字号', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('vitepress-theme-appearance', 'light'))
  await page.goto('/设计文档/图表规范')
  const node = page.locator('.mermaid svg .node rect').first()
  await expect(node).toBeVisible()
  const fill = () => node.evaluate((element) => getComputedStyle(element).fill)
  await expect.poll(fill).toBe('rgb(228, 242, 255)')
  await expect(page.locator('.mermaid svg .node.decision > rect')).toBeVisible()
  await page
    .locator('.mermaid')
    .first()
    .screenshot({ path: testInfo.outputPath('diagram-light.png') })
  await page.locator('.VPSwitchAppearance').first().click()
  await expect.poll(fill).toBe('rgb(32, 58, 83)')
  await page
    .locator('.mermaid')
    .first()
    .screenshot({ path: testInfo.outputPath('diagram-dark.png') })
})

for (const appearance of ['light', 'dark']) {
  test(`截图在${appearance}主题保持正文原尺寸，键盘放大并恢复焦点，手机可关闭`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(
      (value) => localStorage.setItem('vitepress-theme-appearance', value),
      appearance,
    )
    await page.goto('/使用文档/浏览器插件')
    const image = page.locator('.vp-doc .doc-screenshot').first()
    await expect(image).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(image).toBeVisible()
    // 使用主题原有的响应式尺寸：原图不放大，宽图只受正文宽度约束。
    const expectedWidth = () =>
      image.evaluate((element) =>
        Math.min((element as HTMLImageElement).naturalWidth, element.parentElement!.clientWidth),
      )
    const size = await image.boundingBox()
    expect(size!.width).toBeCloseTo(await expectedWidth(), 0)
    await image.focus()
    await page.keyboard.press('Enter')
    const preview = page.getByRole('dialog', { name: '截图预览' })
    await expect(preview).toBeVisible()
    await expect(preview.locator('img')).toHaveAttribute(
      'src',
      await image.evaluate(
        (element) => (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src,
      ),
    )
    await expect
      .poll(async () => (await preview.locator('img').boundingBox())!.width)
      .toBeGreaterThan(size!.width)
    await expect(page.getByRole('button', { name: '关闭截图预览' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(preview).not.toBeVisible()
    await expect(image).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
    await page.keyboard.press('Space')
    await expect(preview).toBeVisible()
    await page.getByRole('button', { name: '关闭截图预览' }).click()
    await expect(image).toBeFocused()
    await page.setViewportSize({ width: 390, height: 844 })
    expect((await image.boundingBox())!.width).toBeCloseTo(await expectedWidth(), 0)
    await image.click()
    await expect(preview).toBeVisible()
    expect((await preview.boundingBox())!.width).toBeLessThanOrEqual(390)
    await page.mouse.click(1, 1)
    await expect(preview).not.toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    expect(errors).toEqual([])
  })
}

test('截图预览随后退关闭，静态无JS正文仍显示所有截图', async ({ page, browser, baseURL }) => {
  await page.goto('/使用文档/桌面端')
  await page.locator('.vp-doc').getByRole('link', { name: '浏览器插件', exact: true }).click()
  await expect(page.locator('.vp-doc h1')).toHaveText('浏览器插件')
  await page.locator('.doc-screenshot').first().click()
  await expect(page.getByRole('dialog', { name: '截图预览' })).toBeVisible()
  await page.goBack()
  await expect(page.locator('.vp-doc h1')).toHaveText('桌面端')
  await expect(page.getByRole('dialog', { name: '截图预览' })).not.toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    const staticPage = await context.newPage()
    await staticPage.goto('/使用文档/浏览器插件')
    const images = staticPage.locator('.vp-doc img')
    expect(await images.count()).toBeGreaterThan(3)
    await expect(images.first()).toBeVisible()
    await expect(images.first()).not.toHaveAttribute('role', 'button')
  } finally {
    await context.close()
  }
})

test('快速重复打开与关闭重开保留新截图，退出恢复原滚动状态', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/使用文档/浏览器插件')
  const image = page.locator('.doc-screenshot').first()
  await expect(image).toHaveAttribute('role', 'button')
  await page.evaluate(() => {
    document.body.style.overflow = 'auto'
  })
  // 在同一任务中触发产品事件，覆盖 showModal 前及原生 close 事件排队的两个窗口。
  await image.evaluate((element) => {
    ;(element as HTMLElement).click()
    ;(element as HTMLElement).click()
  })
  const preview = page.getByRole('dialog', { name: '截图预览' })
  await expect(preview).toBeVisible()
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('.screenshot-viewer button')!.click()
    document.querySelector<HTMLImageElement>('.doc-screenshot')!.click()
  })
  await expect(preview.locator('img')).toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.getByRole('button', { name: '关闭截图预览' }).click()
  await expect(preview).not.toBeVisible()
  await expect(image).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('auto')
  expect(errors).toEqual([])
})
