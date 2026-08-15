import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p389b12252b5e4ed89b3fcf2bc4159fe4',
  appName: 'fares-2026',
  webDir: 'dist',
  // Standalone app: assets are bundled, nothing is loaded from the internet
  // and no external browser is ever used.
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    // Keep every navigation inside the app WebView
    captureInput: true,
  },
  plugins: {
    CapacitorHttp: { enabled: false },
  },
};

export default config;
