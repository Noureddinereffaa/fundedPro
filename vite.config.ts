import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 400,
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
