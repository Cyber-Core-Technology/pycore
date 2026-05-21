import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      // injectManifest: usamos nuestro propio sw.ts con control total
      strategies:  'injectManifest',
      srcDir:      'src',
      filename:    'sw.ts',
      registerType: 'prompt',
      // Usamos nuestro propio site.webmanifest
      manifest: false,
      injectManifest: {
        // Precachear todos los assets del app shell (< 4 MB)
        globPatterns:              ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,   // No activar SW en dev (evita conflictos de hot reload)
        type:    'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    assetsDir: 'erp-assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-pdf':    ['jspdf', 'jspdf-autotable'],
          'vendor-xlsx':   ['xlsx'],
          'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          'vendor-zxing':  ['@zxing/browser', '@zxing/library'],
          'vendor-state':  ['zustand', '@tanstack/react-query', 'axios'],
        },
      },
    },
  },
  server: {
    port:         3000,
    host:         true,
    allowedHosts: ['pycore.app'],
    hmr:          true,
    watch:        { usePolling: true, interval: 300 },
  },
}))
