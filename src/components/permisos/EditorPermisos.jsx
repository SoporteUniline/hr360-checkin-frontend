"use client";
// Editor de rol y permisos de un usuario con acceso (16/12/2026). Lo usa /panel/usuarios-con-acceso.
// valor: { plantilla, permisos: {área: nivel}, empresas: [ids], soloAlgunas } (empresas vacía = todas las del dueño).
// Escritorio: matriz módulos × nivel. Celular: tarjetas con control segmentado (botones de 44 px, sin scroll lateral).
import { useId } from "react";
import { Building2, Check } from "lucide-react";
import { AREAS, NIVELES, PLANTILLAS, matrizDePlantilla, plantillaDeMatriz, resumen } from "@/lib/permisos/permisos.mjs";

const COLOR_NIVEL = {
  sin_acceso: "bg-slate-700 text-white",
  ver: "bg-amber-500 text-white",
  editar: "bg-brand text-white",
};

function Segmentado({ area, nivel, onCambio, etiqueta }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
      {NIVELES.map((n) => {
        const activo = nivel === n.clave;
        return (
          <button key={n.clave} type="button" role="radio" aria-checked={activo} data-area={area} data-nivel={n.clave} data-permiso="libre"
            onClick={() => onCambio(area, n.clave)}
            className={`min-h-11 rounded-lg px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activo ? `${COLOR_NIVEL[n.clave]} shadow-sm` : "text-slate-600 hover:bg-white"}`}>
            {n.nombre}
          </button>
        );
      })}
    </div>
  );
}

export default function EditorPermisos({ valor, onChange, empresasDisponibles = [] }) {
  const ids = useId();
  const { plantilla, permisos, empresas } = valor;
  // «Solo algunas» se recuerda aparte: desmarcarlas todas no debe volverlo «Todas» sin avisar (al guardar se pide una).
  const algunas = valor.soloAlgunas ?? empresas.length > 0;

  const elegirPlantilla = (clave) => onChange({ ...valor, plantilla: clave, permisos: matrizDePlantilla(clave, permisos) });
  const cambiarNivel = (area, nivel) => {
    const nuevos = { ...permisos, [area]: nivel };
    onChange({ ...valor, permisos: nuevos, plantilla: plantillaDeMatriz(nuevos) });
  };
  const todasLas = (nivel) => {
    const nuevos = Object.fromEntries(AREAS.map((a) => [a.clave, nivel]));
    onChange({ ...valor, permisos: nuevos, plantilla: plantillaDeMatriz(nuevos) });
  };
  const alternarEmpresa = (id) => {
    const lista = empresas.includes(id) ? empresas.filter((e) => e !== id) : [...empresas, id];
    onChange({ ...valor, empresas: lista });
  };

  return (
    <div className="space-y-5">
      <section aria-labelledby={`${ids}-rol`} className="space-y-2">
        <h3 id={`${ids}-rol`} className="text-[13px] font-bold text-slate-800">Rol</h3>
        <div role="radiogroup" aria-labelledby={`${ids}-rol`} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {PLANTILLAS.map((p) => {
            const activo = p.clave === plantilla;
            return (
              <button key={p.clave} type="button" role="radio" aria-checked={activo} data-plantilla={p.clave} data-permiso="libre" onClick={() => elegirPlantilla(p.clave)}
                className={`min-h-14 rounded-xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activo ? "border-2 border-brand bg-blue-50" : "border border-slate-200 bg-white hover:bg-slate-50"}`}>
                <b className={`flex items-center gap-1.5 text-sm ${activo ? "text-blue-800" : "text-slate-900"}`}>
                  {activo ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}{p.nombre}
                </b>
                <span className="block text-[13px] leading-snug text-slate-600">{p.descripcion}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] text-slate-500">La plantilla llena los permisos; después puedes ajustar cada módulo (queda como «Personalizado»).</p>
      </section>

      <section aria-labelledby={`${ids}-mod`} className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={`${ids}-mod`} className="text-[13px] font-bold text-slate-800">Permisos por módulo</h3>
          <div className="flex flex-wrap gap-1.5">
            {NIVELES.map((n) => (
              <button key={n.clave} type="button" data-permiso="libre" onClick={() => todasLas(n.clave)}
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                Todo: {n.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Escritorio: matriz */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
          <table className="w-full table-fixed text-left">
            <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2.5">Módulo</th>
                {NIVELES.map((n) => <th key={n.clave} scope="col" className="w-32 px-2 py-2.5 text-center">{n.nombre}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {AREAS.map((a) => (
                <tr key={a.clave} data-fila-area={a.clave}>
                  <th scope="row" className="px-4 py-2 font-normal">
                    <span className="block text-sm font-semibold text-slate-900">{a.nombre}</span>
                    <span className="block truncate text-[13px] text-slate-500" title={a.descripcion}>{a.descripcion}</span>
                  </th>
                  {NIVELES.map((n) => {
                    const activo = (permisos[a.clave] ?? "sin_acceso") === n.clave;
                    return (
                      <td key={n.clave} className="px-2 py-1.5 text-center">
                        <button type="button" role="radio" aria-checked={activo} aria-label={`${a.nombre}: ${n.nombre}`} data-permiso="libre"
                          onClick={() => cambiarNivel(a.clave, n.clave)}
                          className={`mx-auto grid size-11 place-items-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activo ? `border-transparent ${COLOR_NIVEL[n.clave]}` : "border-slate-300 bg-white hover:border-slate-400"}`}>
                          {activo ? <Check className="size-5" aria-hidden="true" /> : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Celular: tarjetas con control segmentado */}
        <ul className="space-y-2 md:hidden">
          {AREAS.map((a) => (
            <li key={a.clave} data-tarjeta-area={a.clave} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{a.nombre}</p>
              <p className="mb-2 text-[13px] leading-snug text-slate-500">{a.descripcion}</p>
              <Segmentado area={a.clave} nivel={permisos[a.clave] ?? "sin_acceso"} onCambio={cambiarNivel} etiqueta={`Permiso en ${a.nombre}`} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${ids}-emp`} className="space-y-2">
        <h3 id={`${ids}-emp`} className="text-[13px] font-bold text-slate-800">Empresas</h3>
        <div role="radiogroup" aria-labelledby={`${ids}-emp`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[[false, "Todas las empresas", "También las que agregues después."], [true, "Solo algunas", "Elige a qué empresas entra."]].map(([valorAlgunas, titulo, texto]) => {
            const activo = algunas === valorAlgunas;
            return (
              <button key={titulo} type="button" role="radio" aria-checked={activo} data-permiso="libre"
                onClick={() => onChange({ ...valor, soloAlgunas: valorAlgunas, empresas: valorAlgunas ? empresas : [] })}
                className={`min-h-14 rounded-xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activo ? "border-2 border-brand bg-blue-50" : "border border-slate-200 bg-white hover:bg-slate-50"}`}>
                <b className={`block text-sm ${activo ? "text-blue-800" : "text-slate-900"}`}>{titulo}</b>
                <span className="text-[13px] text-slate-600">{texto}</span>
              </button>
            );
          })}
        </div>
        {algunas ? (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {empresasDisponibles.map((e) => {
              const marcada = empresas.includes(e.id_empresa);
              return (
                <li key={e.id_empresa}>
                  <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${marcada ? "border-brand bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-800"}`}>
                    <input type="checkbox" className="size-5 accent-[#2563eb]" checked={marcada} onChange={() => alternarEmpresa(e.id_empresa)} />
                    <Building2 className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 break-words">{e.nombre}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <p data-resumen-permisos="" className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-700">
        {resumen(permisos, empresas)}
      </p>
    </div>
  );
}

export const valorInicial = () => ({ plantilla: "administrador", permisos: matrizDePlantilla("administrador"), empresas: [], soloAlgunas: false });
