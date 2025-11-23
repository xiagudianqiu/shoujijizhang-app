import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'SmartLedger Pro',
        short_name: 'SmartLedger',
        description: '极客精神的本地优先记账工具',
        theme_color: '#F8F9FA',
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
  ]
});