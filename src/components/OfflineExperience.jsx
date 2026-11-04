"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ensureOfflineCache } from '@/lib/axios';
import { clockStore, installOfflineWorker, initializeClock, warmOfflineAssets, synchronizeClockQueue, resolveClockDecision, retryClockEvent } from '@/lib/offline-clock';

export default function OfflineExperience() {
  const { dataUser } = useAuth();
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);
  const [events, setEvents] = useState([]);
  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      const store = await clockStore();
      const all = await store.listEvents();
      const own = all.filter(event => event.status !== 'synced' && event.status !== 'rejected' && (event.scope === 'company' || (event.employee === Number(dataUser?.id_empleado) && event.company === Number(dataUser?.id_empresa))));
      if (!disposed) setEvents(own);
    };
    const network = event => setOffline(event.detail?.offline ?? !navigator.onLine);
    const online = () => { window.__adamiaOffline = false; setOffline(false); void synchronizeClockQueue().catch(() => {}); };
    const lost = () => { window.__adamiaOffline = true; setOffline(true); };
    const visible = () => { if (!document.hidden) { void refresh().catch(() => {}); if (navigator.onLine) void synchronizeClockQueue().catch(() => {}); } };
    const follow = event => {
      if (!navigator.onLine || offline) {
        const link = event.target.closest?.('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
        const url = new URL(link.href, location.origin);
        if (url.origin === location.origin && /^\/(panel|empleado|dashboard)(\/|$)/.test(url.pathname)) {
          event.preventDefault(); event.stopPropagation(); location.assign(url.href);
        }
      }
    };
    setOffline(!navigator.onLine);
    void refresh().catch(() => {});
    window.addEventListener('adamia-network', network);
    window.addEventListener('adamia-queue', refresh);
    window.addEventListener('online', online);
    window.addEventListener('offline', lost);
    document.addEventListener('visibilitychange', visible);
    document.addEventListener('click', follow, true);
    const timer = setInterval(() => { void synchronizeClockQueue().catch(() => {}); }, 30000);
    return () => {
      disposed = true; clearInterval(timer);
      window.removeEventListener('adamia-network', network);
      window.removeEventListener('adamia-queue', refresh);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', lost);
      document.removeEventListener('visibilitychange', visible);
      document.removeEventListener('click', follow, true);
    };
  }, [dataUser?.id_empleado, dataUser?.id_empresa, offline]);

  useEffect(() => {
    if (!dataUser) return;
    let disposed = false;
    const prepare = async () => {
      await ensureOfflineCache();
      if (dataUser.tipo_usuario === 'Empleado') void initializeClock({ company: dataUser.id_empresa, employee: dataUser.id_empleado }).catch(() => {});
      await installOfflineWorker();
      if (disposed) return;
      await warmOfflineAssets();
      const cache = await ensureOfflineCache();
      await cache?.snapshotPage();
      await synchronizeClockQueue();
    };
    const timer = setTimeout(() => { void prepare().catch(() => {}); }, 1200);
    const refresh = () => { void prepare().catch(() => {}); };
    window.addEventListener('online', refresh);
    return () => { disposed = true; clearTimeout(timer); window.removeEventListener('online', refresh); };
  }, [pathname, dataUser]);

  if (!offline && !events.length) return null;
  const reviews = events.filter(event => event.status === 'review').length;
  return <aside role="status" aria-live="polite" className="fixed inset-x-3 bottom-24 z-[100] mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-lg">
    <p className="font-semibold">{offline ? 'Sin conexión · Usando información guardada en este celular' : reviews ? 'Hay checadas que necesitan revisión' : 'Con conexión · Checadas pendientes de validar'}</p>
    {offline && <p className="mt-1 text-xs">Puedes consultar lo ya descargado y registrar checadas. Los demás cambios necesitan conexión.</p>}
    {!!events.length && <details className="mt-2"><summary className="cursor-pointer">{events.length - reviews} pendiente(s){reviews ? ` · ${reviews} para revisión` : ''}</summary><ul className="max-h-52 space-y-2 overflow-y-auto pt-2">
      {events.slice(0, 30).map(event => <li key={event.id} className="border-t border-amber-200 pt-2"><p>{event.employeeName || event.alias || 'Checada'} · {new Date(event.captured_at).toLocaleString('es-MX')}</p>{event.status === 'review' && <p className="font-semibold">No aceptada · Se conserva para revisión</p>}<p className="text-xs">{event.error || 'Se enviará automáticamente al recuperar conexión.'}</p>{event.status === 'review' && <button type="button" disabled={offline} onClick={() => { void retryClockEvent(event).catch(() => {}); }} className="mt-1 rounded border border-amber-400 px-2 py-1 disabled:opacity-50">Reintentar validación</button>}{event.status === 'decision' && <div className="mt-1 flex gap-2">{[['salida_temporal', 'Salida temporal'], ['cerrar_turno', 'Cerrar turno']].map(([action, label]) => <button key={action} type="button" onClick={() => { void resolveClockDecision(event, action).catch(() => {}); }} className="rounded border border-amber-400 px-2 py-1">{label}</button>)}</div>}</li>)}
    </ul></details>}
  </aside>;
}
