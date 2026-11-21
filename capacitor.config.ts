import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mx.com.adamia.app",
  appName: "ADAMIA",
  webDir: "public",
  server: {
    url: "https://adamia.com.mx/login",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["adamia.com.mx", "*.adamia.com.mx", "www.adamia.com.mx"],
  },
  appendUserAgent: "AdamiaAppNative",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: "#ffffff",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
