import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
    // maplibre-gl is only ever reached through a React.lazy()'d dynamic
    // import() (BusinessMap.js, loaded on-demand for the Map view), which
    // Vite's dependency scanner can miss at dev-server startup since it
    // never statically sees that import path. When that happens, Vite
    // discovers it "late" on first request, triggers a re-optimize + forced
    // reload, and the in-flight dynamic import for that exact request can
    // fail with "Failed to fetch dynamically imported module". Listing it
    // here forces it into the initial pre-bundle so that race can't happen.
    include: ['maplibre-gl'],
  },
  server: {
    port: 3000,
    open: true,
  },
})
