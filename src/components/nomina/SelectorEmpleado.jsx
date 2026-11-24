"use client";

// Elegir a una persona escribiendo su nombre: lista filtrada (nombre, puesto y departamento), clic o ↑ ↓ Enter.
// Solo personas activas.
import { useId, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Search, X } from "lucide-react";
import axios from "@/lib/axios";

const get = (url) => axios.get(url).then((r) => r.data);
export const nombreDe = (e) => [e?.nombre, e?.apellido_paterno, e?.apellido_materno].filter(Boolean).join(" ");
const sinAcentos = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function SelectorEmpleado({ idEmpresa, value, onChange, etiqueta = "Persona", requerido = false }) {
  const { data, error } = useSWR(idEmpresa ? `/checador/empleados?empresa=${idEmpresa}&estado=Activo&limit=1000&page=1` : null, get);
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const lista = useRef(null);
  const id = useId();
  const empleados = useMemo(() => data?.data ?? [], [data]);
  const elegido = empleados.find((e) => String(e.id_empleado) === String(value));
  const filtrados = useMemo(() => {
    const q = sinAcentos(texto.trim());
    return empleados.filter((e) => !q || sinAcentos(`${nombreDe(e)} ${e.puesto ?? ""} ${e.departamento ?? ""}`).includes(q)).slice(0, 50);
  }, [empleados, texto]);

  const elegir = (e) => { onChange(e ? String(e.id_empleado) : ""); setTexto(""); setAbierto(false); };
  const teclas = (ev) => {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, filtrados.length - 1)); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (ev.key === "Enter" && abierto && filtrados[activo]) { ev.preventDefault(); elegir(filtrados[activo]); }
    else if (ev.key === "Escape") setAbierto(false);
  };

  return (
    <div className="grid gap-1.5 text-sm">
      <label htmlFor={id} className="font-medium">{etiqueta}</label>
      {elegido && !abierto ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <span className="min-w-0"><b className="block truncate text-[#080d36]">{nombreDe(elegido)}</b>{elegido.puesto ? <span className="block truncate text-xs text-slate-500">{elegido.puesto}</span> : null}</span>
          <button type="button" className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-blue-50" onClick={() => { setAbierto(true); setActivo(0); }}>Cambiar</button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id={id} role="combobox" aria-expanded={abierto} aria-controls={`${id}-lista`} aria-autocomplete="list" autoComplete="off"
            aria-activedescendant={abierto && filtrados[activo] ? `${id}-${filtrados[activo].id_empleado}` : undefined}
            required={requerido && !value} placeholder={data ? `Escribe el nombre (${empleados.length} personas)` : "Cargando personas…"}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-base focus:border-brand focus:outline-none"
            value={texto} onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
            onFocus={() => setAbierto(true)} onBlur={() => setTimeout(() => setAbierto(false), 150)} onKeyDown={teclas}
          />
          {texto ? <button type="button" aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" onClick={() => setTexto("")}><X className="size-4" /></button> : null}
          {abierto ? (
            <ul ref={lista} id={`${id}-lista`} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {error ? <li className="px-3 py-2 text-red-700">No se pudo cargar la lista de personas.</li> : null}
              {data && filtrados.length === 0 ? <li className="px-3 py-2 text-slate-500">Nadie coincide con «{texto}».</li> : null}
              {filtrados.map((e, i) => (
                <li key={e.id_empleado} id={`${id}-${e.id_empleado}`} role="option" aria-selected={i === activo}
                  onMouseDown={(ev) => { ev.preventDefault(); elegir(e); }} onMouseEnter={() => setActivo(i)}
                  className={`cursor-pointer px-3 py-2 ${i === activo ? "bg-blue-50" : ""}`}>
                  <span className="block font-semibold text-[#080d36]">{nombreDe(e)}</span>
                  {e.puesto || e.departamento ? <span className="block text-xs text-slate-500">{[e.puesto, e.departamento].filter(Boolean).join(" · ")}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
