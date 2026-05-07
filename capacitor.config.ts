import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.389b12252b5e4ed89b3fcf2bc4159fe4',
  appName: 'fares-2026',
  webDir: 'dist',
  server: {
    url: 'https://389b1225-2b5e-4ed8-9b3f-cf2bc4159fe4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      androidBiometric: { biometricAuth: false },
    },
  },
};

export default config;
