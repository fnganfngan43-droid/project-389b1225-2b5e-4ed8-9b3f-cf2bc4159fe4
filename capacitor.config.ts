import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p389b12252b5e4ed89b3fcf2bc4159fe4',
  appName: 'fares-2026',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  // تطبيق مستقل بالكامل: يتم تحميل الملفات من داخل التطبيق وليس من الإنترنت.
  // لتفعيل التحديث المباشر أثناء التطوير فقط، أزل التعليق عن الأسطر التالية:
  // server: {
  //   url: 'https://389b1225-2b5e-4ed8-9b3f-cf2bc4159fe4.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
};

export default config;
