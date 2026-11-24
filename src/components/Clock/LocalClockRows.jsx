import { TableRow, TableCell } from '@/components/ui/table';
import { Clock4 } from 'lucide-react';

const actions = { entrada: 'Entrada', salida: 'Salida', salida_comida: 'Salida a comer', salida_temporal: 'Salida temporal', cerrar_turno: 'Cerrar turno', auto: 'Entrada / salida por confirmar' };

export default function LocalClockRows({ events, columns, timezone }) {
  if (!events.length) return null;
  return <>
    <TableRow className="bg-blue-50/60 hover:bg-blue-50/60"><TableCell colSpan={columns} className="px-4 py-3">
      <div className="max-w-[calc(100vw-5rem)] md:max-w-none">
        <p className="text-xs font-semibold text-blue-800">Capturas en este dispositivo · {events.length}</p>
        <p className="mt-1 text-xs text-slate-500">Capturas anteriores sin confirmar. RH puede revisar la hora original.</p>
      </div>
    </TableCell></TableRow>
    {events.map(event => <TableRow key={event.id} data-offline-event={event.id} className="bg-blue-50/30 hover:bg-blue-50/50">
      <TableCell colSpan={columns} className="px-4 py-3">
        <div className="flex max-w-[calc(100vw-5rem)] flex-wrap items-start justify-between gap-2 whitespace-normal md:max-w-none">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">{event.employeeName || event.alias || 'Identidad por validar'}</p>
            <p className="mt-1 text-xs text-slate-500">{new Date(event.captured_at).toLocaleString('es-MX', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short', hourCycle: 'h12' })} · {actions[event.action] || 'Movimiento por validar'}</p>
            {event.error && <p className="mt-1 text-xs text-slate-600">{event.error}</p>}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/70 px-2.5 py-1 text-xs font-medium text-blue-800"><Clock4 className="size-3.5 shrink-0" aria-hidden="true" />Requiere revisión</span>
        </div>
      </TableCell>
    </TableRow>)}
  </>;
}
