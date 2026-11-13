import { cookies } from 'next/headers';
import { forwardOfflineEvent } from '@/lib/offline-sync-proxy.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  let origin;
  try { origin = new URL(request.headers.get('origin')); } catch {}
  // Rewrites can give request.url the internal Next hostname. Match the
  // browser-facing Host, as the existing internal API handlers do.
  if (!origin || !['http:', 'https:'].includes(origin.protocol) || origin.host !== request.headers.get('host')) {
    return Response.json({ error: 'Origen no permitido' }, { status: 403 });
  }
  try {
    const body = await request.json();
    return await forwardOfflineEvent(body, (await cookies()).get('token')?.value, process.env.NEXT_PUBLIC_RUTA_BACKEND);
  } catch {
    return Response.json({ error: 'No se pudo sincronizar. La checada sigue guardada.' }, { status: 503 });
  }
}
