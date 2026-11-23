"use client";

// Cumplimiento de checklists (prototipo 23/11/2026): % promedio por persona en el periodo (lo que el jefe aprobó, según el
// peso de cada punto; no enviado = 0 %), cuántos a tiempo y tarde, y si gana el bono (si la empresa tiene Nómina, el bono
// se aplica solo en su recibo). Abajo, productividad: las preguntas que más fallan (por checklist y sucursal). Excel.
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { cumplimientoPorPersona, ganaBono } from "@/lib/tareas/reglas.mjs";
import { fallasPorPregunta } from "@/lib/tareas/preguntas.mjs";
import { masDias } from "@/lib/tareas/demo.mjs";
import { exportToExcel } from "@/utils/exportExcelJS";
import { useTareas } from "./store";
import { Avatar, Barra, botonSecundario, campoBase, colorCalificacion, fechaCorta } from "./comun";

const PERIODOS = [["7", "Últimos 7 días"], ["14", "Últimos 14 días"], ["quincena", "Esta quincena"]];

export default function Cumplimiento() {
  const { envios, checklists, persona, hoy } = useTareas();
  const [periodo, setPeriodo] = useState("14");
  const [checklist, setChecklist] = useState("todos");
  const [minimo, setMinimo] = useState(90);
  const [sucursal, setSucursal] = useState("todas");
  const desde = periodo === "quincena" ? `${hoy.slice(0, 8)}${Number(hoy.slice(8)) <= 15 ? "01" : "16"}` : masDias(hoy, -(Number(periodo) - 1));
  const delPeriodo = useMemo(() => envios.filter((e) => e.fecha >= desde && e.fecha <= hoy
    && (checklist === "todos" || String(e.checklist) === checklist)
    && (sucursal === "todas" || persona(e.persona)?.sucursal === sucursal)), [envios, desde, hoy, checklist, sucursal, persona]);
  const filas = useMemo(() => cumplimientoPorPersona(delPeriodo).map((r) => ({ ...r, p: persona(r.persona) })), [delPeriodo, persona]);
  const fallas = useMemo(() => fallasPorPregunta(delPeriodo, checklists), [delPeriodo, checklists]);
  const sucursales = [...new Set(envios.map((e) => persona(e.persona)?.sucursal).filter(Boolean))];
  const ganan = filas.filter((r) => ganaBono(r.promedio, minimo)).length;

  const exportar = () => exportToExcel(
    filas.map((r) => ({ persona: r.p.nombre, puesto: r.p.puesto, sucursal: r.p.sucursal, asignados: r.asignados, enviados: r.enviados, aTiempo: r.aTiempo, tarde: r.tarde, sinEnviar: r.noEnviados, porRevisar: r.porRevisar, promedio: r.promedio ?? "", bono: ganaBono(r.promedio, minimo) ? "Sí" : "No" })),
    [{ header: "Persona", key: "persona", width: 24 }, { header: "Puesto", key: "puesto", width: 22 }, { header: "Sucursal", key: "sucursal", width: 12 }, { header: "Asignados", key: "asignados", width: 11 }, { header: "Enviados", key: "enviados", width: 11 }, { header: "A tiempo", key: "aTiempo", width: 10 }, { header: "Tarde", key: "tarde", width: 8 }, { header: "Sin enviar", key: "sinEnviar", width: 11 }, { header: "Por revisar", key: "porRevisar", width: 11 }, { header: "% cumplimiento", key: "promedio", width: 15 }, { header: `Bono (≥${minimo}%)`, key: "bono", width: 12 }],
    `Cumplimiento checklists ${desde} a ${hoy}`, { sheetName: "Cumplimiento" },
  );

  const exportarFallas = () => exportToExcel(
    fallas.map((f) => ({ pregunta: f.pregunta, checklist: f.checklist, promedio: f.promedio, veces: f.veces, mal: f.porcentajeMal })),
    [{ header: "Pregunta", key: "pregunta", width: 40 }, { header: "Checklist", key: "checklist", width: 28 }, { header: "Promedio %", key: "promedio", width: 12 }, { header: "Veces", key: "veces", width: 8 }, { header: "% salió mal", key: "mal", width: 12 }],
    `Fallas por pregunta ${desde} a ${hoy}`, { sheetName: "Preguntas" }, // sin acentos: con «más» Chromium nombró el archivo «download»
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Periodo" className={campoBase} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>{PERIODOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        <select aria-label="Checklist" className={campoBase} value={checklist} onChange={(e) => setChecklist(e.target.value)}>
          <option value="todos">Todos los checklists</option>{checklists.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select aria-label="Sucursal" className={campoBase} value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
          <option value="todas">Todas las sucursales</option>{sucursales.map((x) => <option key={x}>{x}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Bono desde
          <input aria-label="Porcentaje mínimo para el bono" type="number" min="50" max="100" className={`${campoBase} w-20`} value={minimo} onChange={(e) => setMinimo(Number(e.target.value) || 0)} />%
        </label>
        <button type="button" className={`${botonSecundario} ml-auto`} onClick={exportar} disabled={!filas.length}><Download className="size-4" /> Exportar a Excel</button>
      </div>
      <p className="text-[12.5px] text-slate-500">Del {fechaCorta(desde)} al {fechaCorta(hoy)}. Cuenta lo que aprobó el jefe según el peso de cada punto; si no lo envió, cuenta 0 %. Los que están por revisar aún no cuentan. <b className="text-slate-700">{ganan} de {filas.length}</b> ganan el bono. Con el módulo de Nómina, el bono se aplica solo en su recibo.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-[13px] tabular-nums">
          <thead><tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">
            <th className="px-3 py-2">Persona</th><th className="px-3">Cumplimiento</th><th className="px-3 text-right">Enviados</th><th className="px-3 text-right">A tiempo</th><th className="px-3 text-right">Tarde</th><th className="px-3 text-right">Sin enviar</th><th className="px-3 text-right">Por revisar</th><th className="px-3 text-center">Bono</th>
          </tr></thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.persona} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2.5"><span className="flex items-center gap-2"><Avatar persona={r.p} /><span><b className="block font-semibold">{r.p.nombre}</b><span className="text-[11.5px] text-slate-500">{r.p.puesto} · {r.p.sucursal}</span></span></span></td>
                <td className="w-64 px-3"><span className="flex items-center gap-2"><span className="w-32"><Barra porcentaje={r.promedio ?? 0} alto="h-2" color={r.promedio >= 90 ? "bg-green-600" : r.promedio >= 75 ? "bg-amber-500" : "bg-red-500"} /></span><b className={colorCalificacion(r.promedio)}>{r.promedio ?? "—"}%</b></span></td>
                <td className="px-3 text-right">{r.enviados} de {r.asignados}</td>
                <td className="px-3 text-right">{r.aTiempo}</td>
                <td className={`px-3 text-right ${r.tarde ? "text-amber-700" : ""}`}>{r.tarde}</td>
                <td className={`px-3 text-right ${r.noEnviados ? "font-semibold text-red-700" : ""}`}>{r.noEnviados}</td>
                <td className="px-3 text-right text-slate-500">{r.porRevisar}</td>
                <td className="px-3 text-center">{ganaBono(r.promedio, minimo) ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11.5px] font-bold text-green-700">Gana</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-500">No</span>}</td>
              </tr>
            ))}
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
                <tr key={`${f.checklist}-${f.pregunta}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 font-medium">{f.pregunta}</td>
                  <td className="px-3 text-slate-500">{f.checklist}</td>
                  <td className="w-56 px-3"><span className="flex items-center gap-2"><span className="w-28"><Barra porcentaje={f.promedio} alto="h-2" color={f.promedio >= 90 ? "bg-green-600" : f.promedio >= 75 ? "bg-amber-500" : "bg-red-500"} /></span><b className={colorCalificacion(f.promedio)}>{f.promedio}%</b></span></td>
                  <td className="px-3 text-right">{f.veces}</td>
                  <td className={`px-3 text-right font-semibold ${f.porcentajeMal >= 20 ? "text-red-700" : "text-slate-600"}`}>{f.porcentajeMal}% de las veces</td>
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
