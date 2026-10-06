import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  testMatch: 'dev-server.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  outputDir: 'test-results/dev',
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // 真实 npm run dev，独立端口与冷缓存；不接管用户 5173 服务。
  webServer: {
    command: 'npm run dev -- --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
