"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { initializeClock, prepareLocalFaces, synchronizeClockQueue } from '@/lib/offline-clock';

// Mounted once for the whole application, independent of the current screen.
export default function FaceReferenceSync() {
  const { dataUser, isLoggedIn } = useAuth();
  useEffect(() => {
    if (!isLoggedIn || !dataUser) return;
    let contexts;
    if (dataUser.tipo_usuario === 'Empleado') {
      const company = Number(dataUser.id_empresa), employee = Number(dataUser.id_empleado);
      if (!Number.isInteger(company) || company <= 0 || !Number.isInteger(employee) || employee <= 0) return;
      contexts = [{ company, employee }];
    } else if (['Recruiter', 'User', 'Admin'].includes(dataUser.tipo_usuario)) {
      const details = dataUser.empresas_detalle || [];
      const ids = [...new Set([...(dataUser.empresas || []), ...details.map(company => company.id_empresa), dataUser.id_empresa].map(Number))];
      contexts = ids.filter(id => Number.isInteger(id) && id > 0).map(company => ({ company, slug: details.find(detail => Number(detail.id_empresa) === company)?.slug || null }));
    } else return;
    contexts = contexts.filter(context => context.company > 0 && (!context.employee || context.employee > 0));
    let disposed = false, busy = false, forceRequested = false;
    const refresh = async (force = false) => {
      if (force) forceRequested = true;
      if (disposed || busy || !navigator.onLine || document.hidden) return;
      busy = true;
      const forceNow = forceRequested;
      forceRequested = false;
      try {
        // Refresh turn snapshots after uploading queued movements, so the
        // references include the latest confirmed entry/exit state.
        await synchronizeClockQueue().catch(() => {});
        const pending = [...contexts];
        const worker = async () => {
          while (!disposed && navigator.onLine && pending.length) {
            const context = pending.shift();
            try {
              await initializeClock(context);
              if (!disposed) await prepareLocalFaces({ ...context, force: forceNow });
            } catch { /* Retain the previous usable snapshot and retry later. */ }
          }
        };
        await Promise.all([worker(), worker()]);
      } finally {
        busy = false;
        if (!disposed && forceRequested && navigator.onLine && !document.hidden) void refresh();
      }
    };
    const online = () => { void refresh(true); };
    const visible = () => { void refresh(); };
    void refresh(true);
    const timer = setInterval(visible, 60000);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [dataUser, isLoggedIn]);
  return null;
}
