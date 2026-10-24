"use client";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/lib/solicitudes-equipo/model.mjs';
import { periodRange, movePeriod } from '@/lib/empleado/presentation.mjs';
import { attendanceTime } from './AttendanceCard';
import { StatusBadge } from './shared';

export default function AttendanceHistory({ rows, timezone }) {
  const [period, setPeriod] = useState('week');
  const [anchor, setAnchor] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date()));
  const [status, setStatus] = useState('Todos');
  const [visible, setVisible] = useState(20);
  const range = periodRange(anchor, period);
  const periodRows = rows.filter(row => range && String(row.fecha).slice(0, 10) >= range.from && String(row.fecha).slice(0, 10) <= range.to).sort((a,b) => String(b.fecha).localeCompare(String(a.fecha)));
  const filtered = periodRows.filter(row => status === 'Todos' || row.attendanceStatus === status);
  const update = (fn, value) => { fn(value); setVisible(20); };
  const label = period === 'year' ? anchor.slice(0, 4) : period === 'month' ? formatDate(anchor, { month: 'long', day: undefined }) : `${formatDate(range?.from)} – ${formatDate(range?.to)}`;
  return <div className="space-y-4">
    <div aria-label="Período de asistencia" className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">{[['week','Semana'],['month','Mes'],['year','Año']].map(([value,text]) => <button key={value} aria-pressed={period === value} onClick={() => update(setPeriod, value)} className={`min-h-11 rounded-lg text-sm font-semibold ${period === value ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{text}</button>)}</div>
    <div className="flex items-center justify-between gap-2"><button aria-label="Período anterior" className="grid size-11 shrink-0 place-items-center rounded-xl border bg-white" onClick={() => update(setAnchor, movePeriod(anchor, period, -1))}><ChevronLeft className="size-4" /></button><p className="text-center text-sm font-semibold" aria-live="polite">{label}</p><button aria-label="Período siguiente" className="grid size-11 shrink-0 place-items-center rounded-xl border bg-white" onClick={() => update(setAnchor, movePeriod(anchor, period, 1))}><ChevronRight className="size-4" /></button></div>
    <div className="grid grid-cols-2 gap-3"><label className="min-w-0 text-xs font-medium text-slate-500">Ir a fecha<input aria-label="Ir a fecha" type="date" value={anchor} onChange={e => { if(e.target.value) update(setAnchor,e.target.value); }} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border bg-white px-2 text-base text-slate-900" /></label><label className="min-w-0 text-xs font-medium text-slate-500">Estado<select aria-label="Estado de asistencia" value={status} onChange={e => update(setStatus,e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-2 text-base text-slate-900">{['Todos','Presente','Ausente','Tardanza','Sin clasificar'].map(item => <option key={item}>{item}</option>)}</select></label></div>
    <div className="grid grid-cols-3 rounded-xl border bg-white p-3 text-center">{[['Presente','Presentes','text-emerald-700'],['Tardanza','Tardanzas','text-amber-700'],['Ausente','Ausencias','text-red-700']].map(([value,text,color]) => <div key={value} className={color}><p className="text-xl font-bold">{new Set(periodRows.filter(row => row.attendanceStatus === value).map(row => String(row.fecha).slice(0,10))).size}</p><p className="text-xs">{text}</p></div>)}</div>
    <p className="text-xs text-slate-500">Resumen de los registros disponibles en este período.</p>
    <div className="divide-y overflow-hidden rounded-2xl border bg-white">{filtered.slice(0,visible).map((row,i) => <details key={`${row.id}-${row.fecha}-${i}`} className="group p-4"><summary className="cursor-pointer list-none"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{formatDate(row.fecha, { weekday:'short' })}</span><StatusBadge status={row.attendanceStatus} /></div><div className="flex items-center gap-6"><span className="flex-1 text-xs text-slate-500">Entrada <strong className="ml-1 text-sm font-semibold text-slate-900">{attendanceTime(row.entrada_corregida && row.entrada_corregida !== '-' ? row.entrada_corregida : row.hora_entrada || row.entrada,timezone)}</strong></span><span className="flex-1 text-xs text-slate-500">Salida <strong className="ml-1 text-sm font-semibold text-slate-900">{attendanceTime(row.salida_corregida && row.salida_corregida !== '-' ? row.salida_corregida : row.hora_salida || row.salida,timezone)}</strong></span><ChevronRight className="size-4 text-slate-400 group-open:rotate-90" /></div><span className="sr-only">Ver detalle</span></summary><div className="mt-3 space-y-2 border-t pt-3 text-sm text-slate-600"><p>Entrada original: {attendanceTime(row.hora_entrada || row.entrada,timezone)}</p><p>Salida original: {attendanceTime(row.hora_salida || row.salida,timezone)}</p><p>Estado del registro: {row.estado || 'No informado'}</p>{row.attendanceDetails?.map((item,index) => <p key={index}>{item.tipo_permiso || item.estado}</p>)}</div></details>)}{!filtered.length && <p className="p-6 text-center text-sm text-slate-500">No hay registros para estos filtros.</p>}</div>
    {visible < filtered.length && <button className="min-h-11 w-full rounded-xl border bg-white text-sm font-semibold" onClick={() => setVisible(n => n+20)}>Ver más registros</button>}
  </div>;
}
