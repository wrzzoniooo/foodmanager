import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Tryb "phone" (npm run dev:phone) uruchamia serwer po HTTPS z certyfikatem lokalnym: telefon pozwala wtedy użyć aparatu.
// BASE_PATH ustawia wdrożenie na GitHub Pages (adres w rodzaju https://login.github.io/spizarnia/); lokalnie jest "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig(({ mode }) => ({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  plugins: [
    react(),
    ...(mode === 'phone' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Spiżarnia',
        short_name: 'Spiżarnia',
        description: 'Wspólna lodówka, szafki i lista zakupów',
        lang: 'pl',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6EDE3',
        theme_color: '#F6EDE3',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'scanner-engine', expiration: { maxEntries: 2 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-images',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
