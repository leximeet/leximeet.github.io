import { createServer } from 'node:http'

// 图表导出独立监听系统分配端口，不借用或停止开发者的 5173 服务。
export async function startDiagramServer(createViteServer, config) {
  const vite = await createViteServer({
    ...config,
    server: { ...config.server, middlewareMode: true, hmr: false },
  })
  const http = createServer(vite.middlewares)
  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    try {
      if (http.listening) {
        http.closeAllConnections()
        await new Promise((resolve, reject) => http.close((e) => (e ? reject(e) : resolve())))
      }
    } finally {
      await vite.close()
    }
  }
  try {
    await new Promise((resolve, reject) => {
      const fail = (e) => reject(e)
      http.once('error', fail)
      http.listen(0, '127.0.0.1', () => {
        http.off('error', fail)
        resolve()
      })
    })
    const address = http.address()
    if (!address || typeof address === 'string') throw new Error('图表渲染端口未分配')
    return { origin: `http://127.0.0.1:${address.port}`, close }
  } catch (e) {
    await close()
    throw e
  }
}
