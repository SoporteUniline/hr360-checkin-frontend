"use client";

// Banda de resumen del periodo (reemplaza las 5 tarjetas KPI en escritorio):
// % de asistencia con degradado + barra proporcional por estado + leyenda.
// Cada segmento y su leyenda FILTRAN la tabla al hacer clic (misma lógica
// que los antiguos checkboxes soloPresentes / soloAusentes / estado).

export default function ResumenAsistencia({
  totals,
  soloPresentes,
  setSoloPresentes,
  soloAusentes,
  setSoloAusentes,
  horasExtra,
  setHorasExtra,
  filtroEstadoAsistencia,
  setFiltroEstadoAsistencia,
  setPage,
}) {
  const {
    total_empleados = 0,
    total_presentes = 0,
    total_tardanzas = 0,
    total_ausencias = 0,
    total_con_horas_extra = 0,
  } = totals || {};

  const pct = total_empleados
    ? Math.round(((total_presentes + total_tardanzas) / total_empleados) * 100)
    : 0;

  const limpiarEstados = () => {
    setSoloPresentes(false);
    setSoloAusentes(false);
    setFiltroEstadoAsistencia("");
  };

  const segmentos = [
    {
      id: "presentes",
      label: "Presentes",
      n: total_presentes,
      color: "#22c55e",
      barClass: "bg-green-500",
      activo: soloPresentes,
      toggle: () => {
        const v = !soloPresentes;
        limpiarEstados();
        setSoloPresentes(v);
        setPage(1);
      },
    },
    {
      id: "tardanzas",
      label: "Tardanzas",
      n: total_tardanzas,
      color: "#eab308",
      barClass: "bg-yellow-500",
      activo: filtroEstadoAsistencia === "Tardanza",
      toggle: () => {
        const v = filtroEstadoAsistencia !== "Tardanza";
        limpiarEstados();
        setFiltroEstadoAsistencia(v ? "Tardanza" : "");
        setPage(1);
      },
    },
    {
      id: "ausencias",
      label: "Ausencias",
      n: total_ausencias,
      color: "#ef4444",
      barClass: "bg-red-500",
      activo: soloAusentes,
      toggle: () => {
        const v = !soloAusentes;
        limpiarEstados();
        setSoloAusentes(v);
        setPage(1);
      },
    },
  ];

  const hayActivo =
    soloPresentes || soloAusentes || filtroEstadoAsistencia === "Tardanza";

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-baseline gap-3">
        <div className="text-[38px] font-extrabold leading-none tracking-tight tabular-nums bg-gradient-to-br from-[#2563eb] to-[#7c3aed] bg-clip-text text-transparent">
          {pct}%
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">
          Asistencia
          <br />
          del periodo
        </div>
      </div>

      <div className="min-w-[280px] flex-1">
        <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full">
          {segmentos
            .filter((s) => s.n > 0)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={s.toggle}
                title={`${s.label}: ${s.n} — clic para filtrar`}
                aria-label={`${s.label}: ${s.n}`}
                style={{ flex: s.n }}
                className={`${s.barClass} min-w-[8px] transition-opacity hover:brightness-105 ${
                  hayActivo && !s.activo ? "opacity-25" : ""
                }`}
              />
            ))}
          {total_empleados === 0 && (
            <div className="flex-1 bg-gray-100" aria-hidden="true" />
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {segmentos.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={s.toggle}
              className={`inline-flex items-center gap-1.5 rounded-md px-1 text-xs font-semibold transition-colors ${
                s.activo
                  ? "text-[#2563eb] shadow-[0_1.5px_0_0_#2563eb]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span
                className="h-2 w-2 rounded-[3px]"
                style={{ backgroundColor: s.color }}
              />
              {s.label}{" "}
              <b className="font-extrabold tabular-nums text-gray-900">{s.n}</b>
              {s.activo && (
                <span className="text-[10px] font-bold text-blue-400">
                  ✕ quitar
                </span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setHorasExtra(!horasExtra);
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-1 text-xs font-semibold transition-colors ${
              horasExtra
                ? "text-[#7c3aed] shadow-[0_1.5px_0_0_#7c3aed]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="h-2 w-2 rounded-[3px] bg-[#7c3aed]" />
            Horas extra{" "}
            <b className="font-extrabold tabular-nums text-gray-900">
              {total_con_horas_extra}
            </b>
            {horasExtra && (
              <span className="text-[10px] font-bold text-purple-400">
                ✕ quitar
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
