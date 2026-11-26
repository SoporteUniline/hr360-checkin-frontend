export const demoBasePath = process.env.NEXT_PUBLIC_ADAMIA_DEMO_BASE_PATH || "";
export const nombreCookieSesion = demoBasePath ? "adamia_demo_token" : "token";

export function rutaDeInstancia(path) {
  return `${demoBasePath}${path}`;
}
