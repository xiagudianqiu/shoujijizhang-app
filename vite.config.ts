import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tailwind-cdn-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
             urlPattern: /^https:\/\/cdn\.lucide\.dev\/.*/i,
             handler: 'CacheFirst',
             options: {
               cacheName: 'icon-cache',
               expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
             }
          }
        ]
      },
      manifest: {
        name: 'SmartLedger Pro',
        short_name: 'SmartLedger',
        description: '极客精神的本地优先记账工具',
        theme_color: '#F8F9FA',
        background_color: '#F8F9FA',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://cdn.lucide.dev/icon-512x512.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn.lucide.dev/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom'],
                charts: ['recharts']
            }
        }
    }
  }
});