"use client";

// Calendario de permisos reusable (Permisos y Dashboard).
// - Basado en un rango [desde, hasta] consistente (columnas y datos salen del
//   mismo rango; se corrige el desfase mes-vs-filtros de la versión anterior).
// - Permisos multi-día como BARRA continua (colSpan), no celdas sueltas.
// - Color por tipo real (leyenda dinámica desde los datos) y distinción de
//   estado: Aprobado (sólido), Pendiente (punteado), Rechazado (tachado).

import { useMemo } from "react";
import dayjs from "dayjs";
import usePermisosData from "@/hooks/usePermisosData";
import { Loader2 } from "lucide-react";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Paleta con clases LITERALES (Tailwind no genera clases dinámicas).
const PALETA = [
  { soft: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  { soft: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  { soft: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  { soft: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  { soft: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
  { soft: "bg-cyan-100 text-cyan-800", dot: "bg-cyan-500" },
  { soft: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  { soft: "bg-fuchsia-100 text-fuchsia-800", dot: "bg-fuchsia-500" },
];

const nombreTipo = (p) =>
  String(p.tipo_permiso_nombre || p.tipo || "Permiso").trim();

export default function PermisosCalendario({
  idEmpresa,
  desde,
  hasta,
  registros: registrosProp,
  festivosSet,
  festivosMap,
  onVerPermiso,
  titulo = "Calendario de permisos",
  headerTone = "dark",
}) {
  const desdeStr = desde ? dayjs(desde).format("YYYY-MM-DD") : null;
  const hastaStr = hasta ? dayjs(hasta).format("YYYY-MM-DD") : null;

  // Si el padre ya trae los registros (p. ej. la página de Permisos), no se
  // vuelve a pedir; si no (Dashboard), el componente los carga solo.
  const debeCargar = !registrosProp;
  const { data, isLoading: cargando } = usePermisosData({
    idEmpresa: debeCargar ? idEmpresa : null,
    page: 1,
    limit: 1000,
    empleado: "",
    idEmpleado: "",
    idTipoPermiso: "",
    estado: "",
    desde: desdeStr,
    hasta: hastaStr,
    excludeCancelados: true,
  });

  const registros = registrosProp || data?.data || [];
  const isLoading = debeCargar && cargando;

  // Días del rango (inclusive), con tope de seguridad.
  const dias = useMemo(() => {
    if (!desdeStr || !hastaStr) return [];
    const out = [];
    let cursor = dayjs(desdeStr);
    const fin = dayjs(hastaStr);
    let guard = 0;
    while ((cursor.isBefore(fin) || cursor.isSame(fin, "day")) && guard < 100) {
      out.push(cursor);
      cursor = cursor.add(1, "day");
      guard += 1;
    }
    return out;
  }, [desdeStr, hastaStr]);

  // Color estable por tipo (leyenda dinámica).
  const { colorDeTipo, tiposPresentes } = useMemo(() => {
    const nombres = Array.from(
      new Set(registros.map((p) => nombreTipo(p))),
    ).sort((a, b) => a.localeCompare(b, "es"));
    const mapa = new Map();
    nombres.forEach((n, i) => mapa.set(n, PALETA[i % PALETA.length]));
    return {
      colorDeTipo: (p) => mapa.get(nombreTipo(p)) || PALETA[0],
      tiposPresentes: nombres.map((n) => ({ nombre: n, color: mapa.get(n) })),
    };
  }, [registros]);

  // Pivote: empleado -> segmentos {startIdx, endIdx, permiso} recortados al rango.
  const filas = useMemo(() => {
    if (!dias.length) return [];
    const start = dayjs(desdeStr);
    const N = dias.length;
    const idxDe = (d) => d.diff(start, "day");

    const empMap = new Map();
    registros.forEach((p) => {
      const key = String(
        p.id_empleado ?? p.empleado_nombre ?? p.empleado ?? "NA",
      );
      const nombre = String(p.empleado_nombre ?? p.empleado ?? "Empleado");
      if (!empMap.has(key)) empMap.set(key, { key, nombre, segs: [] });

      const ini = dayjs(p.fecha_inicio).startOf("day");
      const fin = (p.fecha_fin ? dayjs(p.fecha_fin) : ini).startOf("day");
      const s = Math.max(0, idxDe(ini));
      const e = Math.min(N - 1, idxDe(fin));
      if (s > e) return; // fuera del rango visible
      empMap.get(key).segs.push({ startIdx: s, endIdx: e, permiso: p });
    });

    const lista = Array.from(empMap.values());
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    // Resolver solapes (el que empieza antes gana; el otro se recorta).
    lista.forEach((emp) => {
      emp.segs.sort((a, b) => a.startIdx - b.startIdx);
      let lastEnd = -1;
      emp.plan = [];
      const segsValidos = [];
      emp.segs.forEach((seg) => {
        let st = seg.startIdx;
        if (st <= lastEnd) st = lastEnd + 1;
        if (st > seg.endIdx) return;
        segsValidos.push({ ...seg, startIdx: st });
        lastEnd = seg.endIdx;
      });
      const bySt = new Map(segsValidos.map((s) => [s.startIdx, s]));
      let i = 0;
      while (i < N) {
        const seg = bySt.get(i);
        if (seg) {
          emp.plan.push({ tipo: "bar", span: seg.endIdx - i + 1, seg });
          i = seg.endIdx + 1;
        } else {
          emp.plan.push({ tipo: "empty", idx: i });
          i += 1;
        }
      }
    });
    return lista;
  }, [registros, dias, desdeStr]);

  const claseEstado = (estado) => {
    if (estado === "Pendiente")
      return "border border-dashed border-current/70 opacity-90";
    if (estado === "Rechazado") return "line-through opacity-50 grayscale";
    return ""; // Aprobado / otros: sólido
  };
  const headerBackground = headerTone === "blue" ? "bg-blue-600" : "bg-[#1f2937]";
  const todayRing = headerTone === "blue" ? "ring-white" : "ring-[#60a5fa]";

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="text-sm font-semibold text-gray-900">
          {titulo}
          <span className="ml-2 text-[12px] font-normal text-gray-500">
            {filas.length} empleado{filas.length === 1 ? "" : "s"} ·{" "}
            {dias.length} día{dias.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex-1" />
        {/* Leyenda dinámica de tipos + estados */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-gray-600">
          {tiposPresentes.slice(0, 6).map((t) => (
            <span key={t.nombre} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${t.color.dot}`} />
              {t.nombre}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-sm border border-dashed border-gray-400" />
            Pendiente
          </span>
        </div>
      </div>

      <div className="max-h-[62vh] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando calendario…
          </div>
        ) : !filas.length ? (
          <div className="py-14 text-center text-gray-400">
            No hay permisos en el rango seleccionado.
          </div>
        ) : (
          <table className="w-max min-w-full border-collapse text-[11px]">
            <thead className={`sticky top-0 z-10 text-white ${headerBackground}`}>
              <tr>
                <th className={`sticky left-0 z-20 w-[190px] min-w-[190px] max-w-[190px] px-3 py-1.5 text-left font-semibold ${headerBackground}`}>
                  Empleado
                </th>
                {dias.map((d) => {
                  const finde = [0, 6].includes(d.day());
                  const fStr = d.format("YYYY-MM-DD");
                  const festivo = festivosSet?.has(fStr);
                  const hoy = d.isSame(dayjs(), "day");
                  return (
                    <th
                      key={fStr}
                      title={festivo ? festivosMap?.get(fStr) || "Festivo" : ""}
                      className={`w-9 min-w-9 px-0.5 py-1 text-center font-semibold ${
                        hoy ? `ring-2 ring-inset ${todayRing}` : ""
                      }`}
                    >
                      <div>{d.format("DD")}</div>
                      <div
                        className={`text-[9px] font-normal ${
                          festivo
                            ? "text-rose-300"
                            : finde
                              ? "text-amber-300"
                              : "opacity-70"
                        }`}
                      >
                        {DIAS_SEMANA[d.day()]}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filas.map((emp, ri) => (
                <tr key={emp.key} className={ri % 2 ? "bg-gray-50/60" : "bg-white"}>
                  <td
                    className="sticky left-0 z-10 w-[190px] min-w-[190px] max-w-[190px] truncate bg-inherit px-3 py-1 font-medium text-gray-900"
                    title={emp.nombre}
                  >
                    {emp.nombre}
                  </td>
                  {emp.plan.map((cell, ci) => {
                    if (cell.tipo === "bar") {
                      const c = colorDeTipo(cell.seg.permiso);
                      const est = cell.seg.permiso.estado;
                      return (
                        <td
                          key={`b-${ci}`}
                          colSpan={cell.span}
                          className="px-0.5 py-1"
                        >
                          <button
                            type="button"
                            onClick={() => onVerPermiso?.(cell.seg.permiso)}
                            title={`${nombreTipo(cell.seg.permiso)} · ${est || ""}${
                              cell.seg.permiso.motivo
                                ? " · " + cell.seg.permiso.motivo
                                : ""
                            }`}
                            className={`block w-full truncate rounded px-1.5 py-1 text-[10px] font-bold ${c.soft} ${claseEstado(
                              est,
                            )} transition hover:brightness-95`}
                          >
                            {nombreTipo(cell.seg.permiso)}
                          </button>
                        </td>
                      );
                    }
                    const d = dias[cell.idx];
                    const finde = [0, 6].includes(d.day());
                    const festivo = festivosSet?.has(d.format("YYYY-MM-DD"));
                    return (
                      <td
                        key={`e-${ci}`}
                        className={`w-9 min-w-9 border-b border-gray-100 px-0.5 py-1 ${
                          festivo ? "bg-rose-50" : finde ? "bg-slate-50" : ""
                        }`}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
