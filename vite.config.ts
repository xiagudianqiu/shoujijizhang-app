import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
    define: {
      // This ensures process.env.API_KEY is replaced by the actual string value during build
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY)
    },
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
  };
});