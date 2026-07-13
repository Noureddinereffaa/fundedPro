/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'server/__tests__/**/*.test.js'],
    },
    build: {
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },
      },
    },
    server: {
      proxy: {
        '/api/binance': {
          target: 'https://api.binance.com',
          changeOrigin: true,
          rewrite: path => path.replace('/api/binance', ''),
        },
        '/api/yahoo': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          rewrite: path => path.replace('/api/yahoo', ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
              proxyReq.removeHeader('referer')
            })
            proxy.on('proxyRes', (proxyRes) => {
              delete proxyRes.headers['set-cookie']
            })
          },
        },
        '/api/twelvedata': {
          target: 'https://api.twelvedata.com',
          changeOrigin: true,
          rewrite: path => path.replace('/api/twelvedata', ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.TWELVEDATA_API_KEY
              if (apiKey) {
                const hasQuery = proxyReq.path.includes('?')
                proxyReq.path += `${hasQuery ? '&' : '?'}apikey=${apiKey}`
              }
            })
          },
        },
      },
    },
  }
})
