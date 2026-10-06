import test from 'node:test'
import assert from 'node:assert/strict'
import { startDiagramServer } from './diagram-server.mjs'

test('图表服务器使用独立回环端口并关闭 Vite 与 HTTP，不改变传入配置', async () => {
  let received,
    closed = 0
  const original = { root: '/example', server: { port: 5173, strictPort: true } }
  const server = await startDiagramServer(async (config) => {
    received = config
    return { middlewares: (_, response) => response.end('diagram'), close: async () => closed++ }
  }, original)
  try {
    assert.equal(received.server.middlewareMode, true)
    assert.equal(received.server.hmr, false)
    assert.deepEqual(original.server, { port: 5173, strictPort: true })
    assert.equal(new URL(server.origin).hostname, '127.0.0.1')
    assert.equal(await (await fetch(server.origin)).text(), 'diagram')
  } finally {
    await server.close()
    await server.close()
  }
  assert.equal(closed, 1)
  await assert.rejects(fetch(server.origin))
})
