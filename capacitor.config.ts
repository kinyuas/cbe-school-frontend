import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stancylus.cbeschool',
  appName: 'EduNexa',
  webDir: 'build',
  // ⚠️ REMOVED server.url — this is why the WebView showed "ERR_FAILED".
  // Capacitor now serves the app locally from the bundled build,
  // so the login page works even with zero internet.
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a365d',
      showSpinner: true,
    },
  },
};

export default config;