import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev middleware: serves the back-end API (server/handlers.ts) inside
 * `npm run dev`, so http://localhost:5173/api/* behaves exactly like the
 * deployed Vercel functions. Modules load through ssrLoadModule, so edits to
 * the engine or handlers apply without restarting the dev server.
 */
function keystoneApi(): Plugin {
  return {
    name: 'keystone-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api', async (req, res) => {
        try {
          const [handlers, node] = await Promise.all([
            server.ssrLoadModule('/server/handlers.ts'),
            server.ssrLoadModule('/server/node.ts'),
          ])
          const request = await node.readApiRequest(req)
          node.writeApiResponse(res, await handlers.route(request))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'server error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), keystoneApi()],
})
