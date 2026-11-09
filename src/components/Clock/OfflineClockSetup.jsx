"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { initializeClock, prepareLocalFaces } from '@/lib/offline-clock';

// Kept at the existing clock entry points; preparation is now automatic.
export default function OfflineClockSetup({ companySlug = null, companyId = null }) {
  const { dataUser } = useAuth();
  useEffect(() => {
    const company = companyId || dataUser?.id_empresa;
    const employee = companySlug ? null : dataUser?.tipo_usuario === 'Empleado' ? dataUser.id_empleado : null;
    if (!company || (!companySlug && !employee)) return;
    const prepare = () => { if (navigator.onLine) void initializeClock({ company, employee, slug: companySlug }).then(() => prepareLocalFaces({ company, employee })).catch(() => {}); };
    prepare();
    window.addEventListener('online', prepare);
    return () => window.removeEventListener('online', prepare);
  }, [companySlug, companyId, dataUser?.id_empresa, dataUser?.id_empleado, dataUser?.tipo_usuario]);
  return null;
}
