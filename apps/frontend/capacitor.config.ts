import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liquid.sort',
  appName: 'Liquid Sort',
  webDir: 'dist',
  android: {
    path: 'mobile/android',
  },
  ios: {
    path: 'mobile/ios',
  },
};

export default config;
