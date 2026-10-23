import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mx.com.adamia.app",
  appName: "ADAMIA",
  webDir: "public",
  server: {
    url: "https://www.adamia.com.mx/login",
    cleartext: false,
    androidScheme: "https",
  },
  appendUserAgent: "AdamiaAppNative",
};

export default config;
