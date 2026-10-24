"use client";
import { CalendarDays, ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react';
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
  const label = period === 'year' ? anchor.slice(0, 4) : period === 'month' ? formatDate(anchor, { month: 'long', day: undefined }) : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).formatRange(new Date(`${range.from}T12:00:00Z`), new Date(`${range.to}T12:00:00Z`));
  return <div className="space-y-4">
    <div aria-label="Período de asistencia" className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">{[['week','Semana'],['month','Mes'],['year','Año']].map(([value,text]) => <button key={value} aria-pressed={period === value} onClick={() => update(setPeriod, value)} className={`min-h-9 rounded-md text-sm font-medium ${period === value ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{text}</button>)}</div>
    <div className="flex items-center gap-2">
      <button aria-label="Período anterior" className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white" onClick={() => update(setAnchor, movePeriod(anchor, period, -1))}><ChevronLeft className="size-4" /></button>
      <p className="flex-1 text-center text-xs font-semibold sm:text-sm" aria-live="polite">{label}</p>
      <button aria-label="Período siguiente" className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white" onClick={() => update(setAnchor, movePeriod(anchor, period, 1))}><ChevronRight className="size-4" /></button>
      <label className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-600"><CalendarDays className="size-4" /><input aria-label="Ir a fecha" type="date" value={anchor} onChange={e => { if(e.target.value) update(setAnchor,e.target.value); }} onClick={e => { try { e.currentTarget.showPicker?.(); } catch {} }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label>
    </div>
    <div><label className="sr-only" htmlFor="attendance-status">Estado de asistencia</label><select id="attendance-status" aria-label="Estado de asistencia" value={status} onChange={e => update(setStatus,e.target.value)} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{['Todos','Presente','Ausente','Tardanza','Sin clasificar'].map(item => <option key={item} value={item}>Estado: {item}</option>)}</select><p className="mt-1 px-1 text-[11px] text-slate-500">Presente · Ausente · Tardanza</p></div>
    <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/70 py-3 text-center">{[['Presente','Presentes','text-green-700'],['Tardanza','Tardanza','text-amber-600'],['Ausente','Ausencia','text-red-600']].map(([value,text,color]) => <div key={value} className={color}><p className="text-2xl font-bold leading-7">{new Set(periodRows.filter(row => row.attendanceStatus === value).map(row => String(row.fecha).slice(0,10))).size}</p><p className="text-xs">{text}</p></div>)}</div>
    <h2 className="text-sm font-semibold">Registros {period === 'week' ? 'de la semana' : period === 'month' ? 'del mes' : 'del año'}</h2>
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{filtered.slice(0,visible).map((row,i) => {
      const entry = attendanceTime(row.entrada_corregida && row.entrada_corregida !== '-' ? row.entrada_corregida : row.hora_entrada || row.entrada,timezone);
      const exit = attendanceTime(row.salida_corregida && row.salida_corregida !== '-' ? row.salida_corregida : row.hora_salida || row.salida,timezone);
      return <details key={`${row.id}-${row.fecha}-${i}`} className="group"><summary className="grid min-h-16 cursor-pointer list-none grid-cols-[46px_82px_minmax(0,1fr)_12px] items-center gap-1 px-2 py-2 sm:grid-cols-[65px_100px_minmax(0,1fr)_16px] sm:gap-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="text-xs capitalize leading-4"><span className="block font-medium">{formatDate(row.fecha, { weekday:'short', day:undefined, month:undefined, year:undefined })}</span><span>{formatDate(row.fecha, { day:'numeric', month:'short', year:undefined })}</span></span>
        <span><StatusBadge status={row.attendanceStatus} /></span>
        {entry === '—' && exit === '—' ? <span className="text-[11px] text-slate-500">Sin checadas registradas</span> : <div className="grid grid-cols-2 gap-2">{[['Entrada',entry,LogIn],['Salida',exit,LogOut]].map(([text,time,Icon]) => <span key={text} className="flex items-center gap-1.5"><Icon className="hidden size-3.5 shrink-0 text-slate-500 min-[390px]:block" /><span><span className="block text-[10px] text-slate-500">{text}</span><strong className="block text-[11px] font-medium tabular-nums sm:text-sm">{time}</strong></span></span>)}</div>}
        <ChevronRight className="size-3 text-slate-500 group-open:rotate-90" /><span className="sr-only">Ver detalle</span>
      </summary><div className="space-y-2 border-t border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600"><p>Entrada original: {attendanceTime(row.hora_entrada || row.entrada,timezone)}</p><p>Salida original: {attendanceTime(row.hora_salida || row.salida,timezone)}</p><p>Estado del registro: {row.estado || 'No informado'}</p>{row.attendanceDetails?.map((item,index) => <p key={index}>{item.tipo_permiso || item.estado}</p>)}</div></details>;
    })}{!filtered.length && <p className="p-6 text-center text-sm text-slate-500">No hay registros para estos filtros.</p>}</div>
    <p className="text-center text-xs text-slate-500">Toca un día para ver el detalle</p>
    {visible < filtered.length && <button className="min-h-11 w-full rounded-xl border bg-white text-sm font-semibold" onClick={() => setVisible(n => n+20)}>Ver más registros</button>}
  </div>;
}
