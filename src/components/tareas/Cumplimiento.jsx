"use client";

// Cumplimiento de checklists (23/11/2026, conectado a la API): % promedio por persona en el periodo (lo que aprobó el
// revisor, según el peso de cada pregunta; no enviado = 0 %; no aplica y por revisar no cuentan), a tiempo y tarde, y si
// gana el bono. Abajo, productividad: las preguntas que más fallan. Todo lo calcula el servidor; se exporta a Excel.
import { useState } from "react";
import useSWR from "swr";
import { Download } from "lucide-react";
import axios from "@/lib/axios";
import { ganaBono } from "@/lib/tareas/reglas.mjs";
import { exportToExcel } from "@/utils/exportExcelJS";
import { useTareas } from "./store";
import { Avatar, Barra, botonSecundario, campoBase, colorCalificacion, fechaCorta } from "./comun";

const get = (url) => axios.get(url).then((r) => r.data);
const PERIODOS = [["7", "Últimos 7 días"], ["14", "Últimos 14 días"], ["30", "Últimos 30 días"], ["quincena", "Esta quincena"]];
const color = (p) => (p >= 90 ? "bg-green-600" : p >= 75 ? "bg-amber-500" : "bg-red-500");

export default function Cumplimiento() {
  const { idEmpresa, checklists, sucursales, persona, hoy } = useTareas();
  const [periodo, setPeriodo] = useState("14");
  const [checklist, setChecklist] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [minimo, setMinimo] = useState(90);
  const desde = periodo === "quincena" ? `${hoy.slice(0, 8)}${Number(hoy.slice(8)) <= 15 ? "01" : "16"}` : new Date(Date.parse(`${hoy}T12:00:00Z`) - (Number(periodo) - 1) * 86400000).toISOString().slice(0, 10);
  const q = new URLSearchParams({ empresa: idEmpresa, desde, hasta: hoy, ...(checklist ? { checklist } : {}), ...(sucursal ? { sucursal } : {}) });
  const { data, isLoading, error } = useSWR(`/checador/tareas/cumplimiento?${q}`, get, { keepPreviousData: true });
  const filas = data?.personas ?? [];
  const fallas = data?.fallas ?? [];
  const ganan = filas.filter((r) => ganaBono(r.promedio, minimo)).length;

  const exportar = () => exportToExcel(
    filas.map((r) => ({ persona: r.nombre, puesto: r.puesto, sucursal: r.sucursal, asignados: r.asignados, enviados: r.enviados, aTiempo: r.a_tiempo, tarde: r.tarde, sinEnviar: r.no_enviados, porRevisar: r.por_revisar, promedio: r.promedio ?? "", bono: ganaBono(r.promedio, minimo) ? "Sí" : "No" })),
    [{ header: "Persona", key: "persona", width: 24 }, { header: "Puesto", key: "puesto", width: 22 }, { header: "Sucursal", key: "sucursal", width: 14 }, { header: "Asignados", key: "asignados", width: 11 }, { header: "Enviados", key: "enviados", width: 11 }, { header: "A tiempo", key: "aTiempo", width: 10 }, { header: "Tarde", key: "tarde", width: 8 }, { header: "Sin enviar", key: "sinEnviar", width: 11 }, { header: "Por revisar", key: "porRevisar", width: 11 }, { header: "% cumplimiento", key: "promedio", width: 15 }, { header: `Bono (>=${minimo}%)`, key: "bono", width: 12 }],
    `Cumplimiento checklists ${desde} a ${hoy}`, { sheetName: "Cumplimiento" },
  );
  const exportarFallas = () => exportToExcel(
    fallas.map((f) => ({ pregunta: f.pregunta, checklist: f.checklist, promedio: f.promedio, veces: f.veces, mal: f.porcentaje_mal })),
    [{ header: "Pregunta", key: "pregunta", width: 40 }, { header: "Checklist", key: "checklist", width: 28 }, { header: "Promedio %", key: "promedio", width: 12 }, { header: "Veces", key: "veces", width: 8 }, { header: "% salió mal", key: "mal", width: 12 }],
    `Fallas por pregunta ${desde} a ${hoy}`, { sheetName: "Preguntas" }, // sin acentos: con «más» Chromium nombró el archivo «download»
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Periodo" className={campoBase} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>{PERIODOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        <select aria-label="Checklist" className={campoBase} value={checklist} onChange={(e) => setChecklist(e.target.value)}>
          <option value="">Todos los checklists</option>{checklists.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select aria-label="Sucursal" className={campoBase} value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
          <option value="">Todas las sucursales</option>{sucursales.map((x) => <option key={x}>{x}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Bono desde
          <input aria-label="Porcentaje mínimo para el bono" type="number" min="50" max="100" className={`${campoBase} w-20`} value={minimo} onChange={(e) => setMinimo(Number(e.target.value) || 0)} />%
        </label>
        <button type="button" className={`${botonSecundario} ml-auto`} onClick={exportar} disabled={!filas.length}><Download className="size-4" /> Exportar a Excel</button>
      </div>
      <p className="text-[12.5px] text-slate-500">Del {fechaCorta(desde)} al {fechaCorta(hoy)}. Cuenta lo que aprobó el revisor según el peso de cada pregunta; si no lo envió, cuenta 0 %. «No aplica» (no checó ese día) y los que están por revisar no cuentan. <b className="text-slate-700">{ganan} de {filas.length}</b> ganan el bono.</p>
      {error ? <p role="alert" className="text-sm text-red-700">No se pudo cargar el cumplimiento.</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-[13px] tabular-nums">
          <thead><tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">
            <th className="px-3 py-2">Persona</th><th className="px-3">Cumplimiento</th><th className="px-3 text-right">Enviados</th><th className="px-3 text-right">A tiempo</th><th className="px-3 text-right">Tarde</th><th className="px-3 text-right">Sin enviar</th><th className="px-3 text-right">Por revisar</th><th className="px-3 text-center">Bono</th>
          </tr></thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.id_empleado} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2.5"><span className="flex items-center gap-2"><Avatar persona={persona(r.id_empleado) ?? { nombre: r.nombre, ini: "?" }} /><span><b className="block font-semibold">{r.nombre}</b><span className="text-[11.5px] text-slate-500">{[r.puesto, r.sucursal].filter(Boolean).join(" · ")}</span></span></span></td>
                <td className="w-64 px-3"><span className="flex items-center gap-2"><span className="w-32"><Barra porcentaje={r.promedio ?? 0} alto="h-2" color={color(r.promedio)} /></span><b className={colorCalificacion(r.promedio)}>{r.promedio ?? "—"}%</b></span></td>
                <td className="px-3 text-right">{r.enviados} de {r.asignados}</td>
                <td className="px-3 text-right">{r.a_tiempo}</td>
                <td className={`px-3 text-right ${r.tarde ? "text-amber-700" : ""}`}>{r.tarde}</td>
                <td className={`px-3 text-right ${r.no_enviados ? "font-semibold text-red-700" : ""}`}>{r.no_enviados}</td>
                <td className="px-3 text-right text-slate-500">{r.por_revisar}</td>
                <td className="px-3 text-center">{ganaBono(r.promedio, minimo) ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11.5px] font-bold text-green-700">Gana</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-500">No</span>}</td>
              </tr>
            ))}
            {!filas.length && !isLoading ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Aún no hay checklists en este periodo.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <section aria-label="Preguntas que más fallan" className="space-y-2 pt-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <h3 className="text-[15px] font-bold text-[#080d36]">Preguntas que más fallan</h3>
            <p className="text-[12.5px] text-slate-500">Promedio de cada pregunta en los checklists revisados del periodo: dónde está el problema.</p>
          </div>
          <button type="button" className={`${botonSecundario} ml-auto`} disabled={!fallas.length} onClick={exportarFallas}><Download className="size-4" /> Exportar preguntas</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-[13px] tabular-nums">
            <thead><tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">
              <th className="px-3 py-2">Pregunta</th><th className="px-3">Checklist</th><th className="px-3">Promedio</th><th className="px-3 text-right">Veces</th><th className="px-3 text-right">Salió mal</th>
            </tr></thead>
            <tbody>
              {fallas.slice(0, 10).map((f) => (
                <tr key={f.id_pregunta} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 font-medium">{f.pregunta}</td>
                  <td className="px-3 text-slate-500">{f.checklist}</td>
                  <td className="w-56 px-3"><span className="flex items-center gap-2"><span className="w-28"><Barra porcentaje={f.promedio} alto="h-2" color={color(f.promedio)} /></span><b className={colorCalificacion(f.promedio)}>{f.promedio}%</b></span></td>
                  <td className="px-3 text-right">{f.veces}</td>
                  <td className={`px-3 text-right font-semibold ${f.porcentaje_mal >= 20 ? "text-red-700" : "text-slate-600"}`}>{f.porcentaje_mal}% de las veces</td>
                </tr>
              ))}
              {!fallas.length ? <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Aún no hay checklists revisados en este periodo.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
