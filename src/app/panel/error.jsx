"use client";
import { useEffect, useState } from 'react';

export default function PanelError({ reset }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => { setOffline(!navigator.onLine || window.__adamiaOffline === true); }, []);
  return <section role="alert" className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-slate-800">
    <h1 className="text-xl font-semibold">{offline ? 'No se pudo abrir esta pantalla sin conexión' : 'No se pudo abrir este módulo'}</h1>
    <p className="mt-3">{offline ? 'Tus checadas pendientes siguen guardadas. Puedes volver a abrir la copia descargada de esta pantalla o regresar al menú.' : 'Intenta abrirlo de nuevo. Las checadas pendientes se conservan en el celular.'}</p>
    <button type="button" className="mt-4 min-h-11 rounded-lg bg-blue-700 px-4 text-white" onClick={() => offline ? window.location.reload() : reset()}>Volver a intentar</button>
  </section>;
}
