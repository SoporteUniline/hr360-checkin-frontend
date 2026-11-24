"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Clock4, ClipboardCheck, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetcherWithToken } from '@/lib/fetcher';

function NavigationLink({ href, label, icon: Icon }) {
  const pathname = usePathname();
  return <Link href={href} prefetch={false} aria-current={pathname === href ? 'page' : undefined}
    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-2 text-[11px] font-semibold transition ${pathname === href ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'}`}>
    <Icon className="size-3.5 shrink-0" aria-hidden="true" />{label}
  </Link>;
}

function CompanyClockLink({ company, slug, multiple }) {
  const suppliedSlug = slug || company.slug;
  const { data } = useSWR(!suppliedSlug ? `/empresas/id/${company.id_empresa}/slug` : null, fetcherWithToken, { shouldRetryOnError: false });
  const resolvedSlug = suppliedSlug || data?.slug;
  const label = multiple ? `Reloj · ${company.nombre || company.nombre_empresa || company.id_empresa}` : 'Reloj';
  return <NavigationLink href={resolvedSlug ? `/${encodeURIComponent(resolvedSlug)}` : '/seleccionar-reloj'} label={label} icon={Clock4} />;
}

export default function ClockNavigation({ companyId = null, companySlug = null }) {
  const { dataUser, isLoggedIn } = useAuth();
  if (!isLoggedIn || !dataUser) return null;
  const employee = dataUser.tipo_usuario === 'Empleado';
  const hr = ['Recruiter', 'User'].includes(dataUser.tipo_usuario);
  if (!employee && !hr) return null;
  if (employee && companyId && Number(companyId) !== Number(dataUser.id_empresa)) return null;
  const details = dataUser.empresas_detalle || [];
  const assigned = [...new Set([...(dataUser.empresas || []).map(Number), ...details.map(company => Number(company.id_empresa))])].filter(id => Number.isInteger(id) && id > 0);
  const selected = Number(companyId);
  if (hr && selected > 0 && !assigned.includes(selected)) return null;
  const companies = (assigned.includes(selected) ? [selected] : assigned).map(id => details.find(company => Number(company.id_empresa) === id) || { id_empresa: id });
  return <nav aria-label="Navegación de asistencia" className="min-w-0 md:hidden">
    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain py-1">
      {employee ? <>
        <NavigationLink href="/empleado/reloj-checador" label="Reloj" icon={Clock4} />
        <NavigationLink href="/empleado/panel/asistencias" label="Mis asistencias" icon={ClipboardCheck} />
      </> : <>
        {companies.map(company => <CompanyClockLink key={company.id_empresa} company={company} slug={Number(company.id_empresa) === selected ? companySlug : null} multiple={companies.length > 1} />)}
        <NavigationLink href="/panel/registro-asistencia" label="Asistencias" icon={ClipboardCheck} />
        <NavigationLink href="/panel/registro-de-entradas-y-salidas" label="Entradas/salidas" icon={ArrowLeftRight} />
      </>}
    </div>
  </nav>;
}
