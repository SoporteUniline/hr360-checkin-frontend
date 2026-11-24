"use client";
import { useEffect, useState } from 'react';

// Si el error es un ChunkLoadError (se publicó una versión nueva con la página abierta), se recarga una vez.
// En cualquier otro error se muestra el detalle técnico para poder reportarlo.
const esVersionNueva = (e) => /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i.test(`${e?.name ?? ''} ${e?.message ?? ''}`);
const CLAVE = 'adamia-recarga-version';

export default function PanelError({ error, reset }) {
  const [offline, setOffline] = useState(false);
  const [recargando, setRecargando] = useState(false);
  useEffect(() => {
    const sinRed = !navigator.onLine || window.__adamiaOffline === true;
    setOffline(sinRed);
    if (error) console.error('Error en el panel:', error);
    if (sinRed || !esVersionNueva(error)) return;
    let ultima = 0;
    try { ultima = Number(sessionStorage.getItem(CLAVE)) || 0; } catch {}
    if (Date.now() - ultima < 30000) return; // ya se intentó: no entrar en ciclo
    try { sessionStorage.setItem(CLAVE, String(Date.now())); } catch {}
    setRecargando(true);
    window.location.reload();
  }, [error]);

  if (recargando) {
    return <section role="status" className="mx-auto max-w-xl rounded-xl border border-blue-200 bg-blue-50 p-6 text-slate-800">
      <h1 className="text-xl font-semibold">Hay una versión nueva de ADAMIA</h1>
      <p className="mt-3">Cargándola…</p>
    </section>;
  }
  const detalle = [error?.name, error?.message].filter(Boolean).join(': ') || null;
  return <section role="alert" className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-slate-800">
    <h1 className="text-xl font-semibold">{offline ? 'No se pudo abrir esta pantalla sin conexión' : 'No se pudo abrir este módulo'}</h1>
    <p className="mt-3">{offline ? 'Comprueba tu conexión a internet y vuelve a intentarlo.' : 'Intenta abrir el módulo de nuevo.'}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className="min-h-11 rounded-lg bg-blue-700 px-4 text-white" onClick={() => offline ? window.location.reload() : reset()}>Volver a intentar</button>
      {!offline ? <button type="button" className="min-h-11 rounded-lg border border-slate-300 bg-white px-4" onClick={() => window.location.reload()}>Recargar la página</button> : null}
    </div>
    {!offline && (detalle || error?.digest) ? (
      <details className="mt-4 text-xs text-slate-600">
        <summary className="cursor-pointer">Detalle para soporte</summary>
        <p className="mt-2 break-words font-mono">{detalle}{error?.digest ? ` (ref. ${error.digest})` : ''}</p>
      </details>
    ) : null}
  </section>;
}
