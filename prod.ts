import { App } from './backend/index'

Bun.serve({
  port: 3000,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api')) {
      const apiResponse = await App.fetch(req)
      return apiResponse
    } else {
      const file = Bun.file(`./dist${url.pathname}`)
      if (await file.exists()) return new Response(file)
    }
    return new Response(Bun.file('./dist/index.html'))
  },
})
