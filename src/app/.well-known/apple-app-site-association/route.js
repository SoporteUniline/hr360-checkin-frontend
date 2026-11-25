// iOS · asociación de dominio para passkeys (webcredentials). Sin APPLE_TEAM_ID → 404. Ver docs/passkeys-sesiones.md.
import { appleAppSiteAssociation, respuestaJson } from "@/lib/passkeys/wellKnown.mjs";

export const dynamic = "force-dynamic";

export function GET() {
  return respuestaJson(appleAppSiteAssociation(process.env.APPLE_TEAM_ID));
}
