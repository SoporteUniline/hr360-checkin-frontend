"use client";

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/AuthContext';

export default function OfflineClockSetup() {
  const { dataUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Prepara este celular con internet antes de usar el reloj sin conexión.');
  const [pendingMessage, setPendingMessage] = useState('');

  useEffect(() => {
    if (!dataUser?.id_empleado || !dataUser?.id_empresa) return;
    let disposed = false;
    let syncing = false;
    const sync = async () => {
      if (syncing || !navigator.onLine) return;
      syncing = true;
      try {
        const store = await import(/* webpackIgnore: true */ '/offline-clock/store.mjs');
        const profile = { id_empleado: Number(dataUser.id_empleado), id_empresa: Number(dataUser.id_empresa) };
        const events = store.ownEvents(await store.listEvents(), profile);
        if (disposed || !events.some(event => event.status !== 'synced')) return;
        const { data: current } = await axios.get('/checador/reloj/offline/perfil');
        if (current.id_empleado !== profile.id_empleado || current.id_empresa !== profile.id_empresa) return;
        await store.syncEvents(events, async event => {
          if (disposed) throw new Error('Sincronización pausada');
          const { data } = await axios.post('/checador/reloj/offline/sincronizar', {
            id: event.id, action: event.action, captured_at: event.captured_at,
            method: event.method, code: event.code, descriptor: event.descriptor,
            latitude: event.latitude, longitude: event.longitude,
          }, { timeout: 20000 });
          return data;
        }, store.saveEvent);
        const pending = store.ownEvents(await store.listEvents(), profile).filter(event => event.status !== 'synced');
        if (!disposed) setPendingMessage(pending.length ? `${pending.length} checada(s) pendiente(s). Abre el reloj offline para revisar: ${pending[0].error || 'Sincronización pendiente'}` : 'Las checadas guardadas en este celular ya se sincronizaron.');
      } catch (error) {
        if (!disposed) setPendingMessage(error.response?.data?.error || 'No se pudieron consultar los pendientes del celular.');
      } finally { syncing = false; }
    };
    void sync();
    const onVisible = () => { if (!document.hidden) void sync(); };
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(sync, 30000);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dataUser?.id_empleado, dataUser?.id_empresa]);

  const prepare = async () => {
    setBusy(true);
    try {
      if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('Este dispositivo requiere HTTPS y soporte de almacenamiento offline.');
      const { data: profile } = await axios.get('/checador/reloj/offline/perfil');
      const registration = await navigator.serviceWorker.register('/offline-clock-sw.js', { scope: '/' });
      // Wait for this worker, not an unrelated registration's ready promise.
      await registration.update();
      const worker = registration.installing || registration.waiting || registration.active;
      if (!worker) throw new Error('No se pudo instalar el reloj offline.');
      if (worker.state !== 'activated') await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('La descarga está tardando. Conserva internet e intenta nuevamente.')), 90000);
        const changed = () => {
          if (worker.state === 'activated' || worker.state === 'redundant') {
            clearTimeout(timer);
            worker.removeEventListener('statechange', changed);
            if (worker.state === 'redundant') reject(new Error('No se completó la descarga. Intenta nuevamente con internet.'));
            else resolve();
          }
        };
        worker.addEventListener('statechange', changed);
        changed();
      });
      const store = await import(/* webpackIgnore: true */ '/offline-clock/store.mjs');
      const session = await store.fingerprint(Cookies.get('token'));
      if (!session) throw new Error('Inicia sesión nuevamente para preparar el reloj.');
      const api = new URL(process.env.NEXT_PUBLIC_RUTA_BACKEND, window.location.origin).href.replace(/\/$/, '');
      await store.setConfig({ ...profile, api, session });
      await navigator.storage?.persist?.();
      setMessage('Reloj preparado. Puedes abrirlo sin internet durante los próximos siete días.');
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'No se pudo preparar el reloj offline.');
    } finally { setBusy(false); }
  };

  return (
    <section className="mx-4 mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm text-slate-700" role="status">{message}</p>
      {pendingMessage && <p className="mt-2 text-sm font-medium text-slate-800" role="status">{pendingMessage}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={prepare} className="min-h-12 rounded-lg bg-blue-700 px-4 text-white disabled:opacity-50">{busy ? 'Descargando reloj y modelos faciales…' : 'Preparar reloj offline'}</button>
        <a href="/reloj-offline.html" className="flex min-h-12 items-center rounded-lg border border-blue-300 bg-white px-4 font-medium text-blue-800">Abrir reloj offline</a>
      </div>
    </section>
  );
}
