import type { CapacitorConfig } from '@capacitor/cli';

/** Aplikacja Android (APK): ta sama strona w oknie WebView, pliki z aplikacji, bez paska adresu. */
const config: CapacitorConfig = {
  appId: 'pl.shelfie.app',
  appName: 'Shelfie',
  webDir: 'dist',
  backgroundColor: '#F6EDE3',
  server: {
    androidScheme: 'https',
  },
};

export default config;
