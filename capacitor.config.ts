import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stancylus.cbeschool',
  appName: 'CBE System',
  webDir: 'build',
  server: {
    url: 'https://cbe-school-frontend.vercel.app',
    cleartext: false,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a365d',
      showSpinner: true
    }
  }
};

export default config;