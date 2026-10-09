import {
  getScope,
  loadCatalogs,
  checkOrigin,
  noStore,
  errorResponse,
} from "./session";
import { ensure } from "./validation.mjs";
import { snapshot } from "./read.mjs";
import { executeCommand } from "./commands.mjs";
export async function handleRead(request, self = false) {
  try {
    const scope = await loadCatalogs(await getScope(request, self));
    return Response.json(
      { state: await snapshot(scope) },
      { headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function handleWrite(request, self = false) {
  try {
    checkOrigin(request);
    ensure(
      Number(request.headers.get("content-length") || 0) <= 100000,
      "La solicitud es demasiado grande.",
      413,
    );
    const raw = await request.text();
    ensure(raw.length <= 100000, "La solicitud es demasiado grande.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      ensure(false, "El formato de la solicitud no es válido.", 400);
    }
    const scope = await loadCatalogs(await getScope(request, self));
    const result = await executeCommand(
      scope,
      body.command,
      request.headers.get("idempotency-key"),
      body.revision,
    );
    // La escritura ya está confirmada. Una falla de refresco no debe presentarse
    // como escritura fallida ni provocar una segunda entrega con otra clave.
    return Response.json({ result }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
