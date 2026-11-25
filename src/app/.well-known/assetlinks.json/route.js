// Android · Digital Asset Links (inicios de sesión compartidos con la app). Sin ANDROID_SHA256_FINGERPRINTS → 404.
// Ver docs/passkeys-sesiones.md.
import { assetLinks, respuestaJson } from "@/lib/passkeys/wellKnown.mjs";

export const dynamic = "force-dynamic";

export function GET() {
  return respuestaJson(assetLinks(process.env.ANDROID_SHA256_FINGERPRINTS));
}
