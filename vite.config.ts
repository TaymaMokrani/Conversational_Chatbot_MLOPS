import { App } from './backend/index'
import { elysiaConnect } from './backend/libs/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import pages from 'vite-plugin-pages'


export default defineConfig({
  base: '/', // Keep this as '/' for absolute paths
  build: {
    outDir: 'dist', // Ensures output goes to ./dist
  },
  plugins: [
    tailwindcss(),
    react(),
    pages({
      dirs: 'frontend/pages',
      onRoutesGenerated(routes) {
        const fixLayouts = (routes: any) => {
          for (const route of routes) {
            if (route.children) {
              const layoutIndex = route.children.findIndex(
                (child: any) =>
                  child.path === '_layout' ||
                  (child.path === '' && child.component?.includes('_layout')),
              )

              if (layoutIndex > -1) {
                const layoutRoute = route.children[layoutIndex]
                route.element = layoutRoute.element
                route.component = layoutRoute.component // Preserve for internal plugin use
                route.children.splice(layoutIndex, 1)
              }
              fixLayouts(route.children)
            }
          }
          return routes
        }

        return fixLayouts(routes)
      },
    }),
    elysiaConnect(App, {
      prefix: '/api',
    }),
  ],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
    },
  },
})
