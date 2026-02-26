import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hr360.checkin",
  appName: "Checkin Adamia",
  webDir: ".next",
  server: {
    url: "https://hr360checkindev.netlify.app/",
    cleartext: true,
  },
};

export default config;
