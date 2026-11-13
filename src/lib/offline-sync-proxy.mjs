import { createHash } from 'node:crypto';

export async function forwardOfflineEvent(body, token, api, request = fetch) {
  if (!token || typeof body?.session !== 'string' || createHash('sha256').update(token).digest('hex') !== body.session) {
    return Response.json({ error: 'Inicia sesión con la cuenta que preparó el reloj.' }, { status: 401 });
  }
  if (!body.event || typeof body.event !== 'object' || Array.isArray(body.event)) {
    return Response.json({ error: 'Checada inválida' }, { status: 400 });
  }
  // Destination is server configuration; never accept an API URL or token from IDB.
  const response = await request(`${api.replace(/\/$/, '')}/checador/reloj/offline/sincronizar`, {
    method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body.event), signal: AbortSignal.timeout(15000),
  });
  return Response.json(await response.json(), { status: response.status, headers: { 'Cache-Control': 'no-store' } });
}
