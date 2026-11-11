"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { initializeClock, prepareLocalFaces, synchronizeClockQueue } from '@/lib/offline-clock';

// Kept at the existing clock entry points; preparation is now automatic.
export default function OfflineClockSetup({ companySlug = null, companyId = null }) {
  const { dataUser } = useAuth();
  useEffect(() => {
    const company = companyId || dataUser?.id_empresa;
    if (!company || (!companySlug && dataUser?.tipo_usuario !== 'Empleado')) return;
    let disposed = false, busy = false, forceRequested = false;
    const prepare = async (force = false) => {
      if (force) forceRequested = true;
      if (disposed || busy || !navigator.onLine || document.hidden) return;
      busy = true;
      const forceNow = forceRequested;
      forceRequested = false;
      try {
        await synchronizeClockQueue();
        const context = { company, slug: companySlug };
        await initializeClock(context);
        if (!disposed) await prepareLocalFaces({ ...context, force: forceNow });
      } catch { /* Keep downloaded references and retry automatically. */ }
      finally {
        busy = false;
        if (!disposed && forceRequested) void prepare();
      }
    };
    const online = () => { void prepare(true); };
    const visible = () => { void prepare(); };
    void prepare();
    const timer = setInterval(visible, 60000);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visible); };
  }, [companySlug, companyId, dataUser?.id_empresa, dataUser?.id_empleado, dataUser?.tipo_usuario]);
  return null;
}
