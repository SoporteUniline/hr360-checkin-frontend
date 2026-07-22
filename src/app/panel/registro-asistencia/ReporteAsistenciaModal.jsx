"use client";

// Reporte de asistencia en formato matriz: filas = empleados, columnas = días
// del rango, celdas P (presente) / A (falta injustificada) / J (justificado) /
// · (sin registro). Todo se arma en el frontend a partir de lo que ya devuelve
// /checador/asistencias (estadoAsistencia + goce_sueldo), sin backend nuevo.

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetcherWithToken } from "@/lib/fetcher";
import { FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
import { enqueueSnackbar } from "notistack";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TZ = "America/Mexico_City";
// Letra de día alineada con el reporte de referencia (0=Dom … 6=Sáb).
const LETRA_DIA = ["S", "M", "T", "W", "Th", "F", "St"];

const esVerdadero = (v) =>
  v === true ||
  v === 1 ||
  v === "1" ||
  ["si", "sí", "true", "con goce"].includes(
    String(v ?? "").trim().toLowerCase(),
  );

// Clasifica un registro del día en un tipo de celda.
const tipoDeRegistro = (r) => {
  if (!r) return "sin";
  const est = String(r.estadoAsistencia || r.estado || "").toLowerCase();
  if (est.includes("presente") || est.includes("tardanza") || est.includes("retardo"))
    return "presente";
  if (
    est.includes("permiso") ||
    est.includes("vacacion") ||
    est.includes("incapacidad") ||
    est.includes("justific")
  )
    return "justificado";
  if (est.includes("ausente") || est.includes("falta")) {
    // Ausente CON goce de sueldo = justificado; SIN goce = falta injustificada.
    return esVerdadero(r.goce_sueldo) ? "justificado" : "falta";
  }
  if (r.entrada) return "presente";
  return "sin";
};

const PRECEDENCIA = { presente: 3, justificado: 2, falta: 1, sin: 0 };
const CELDA = {
  presente: { code: "P", text: "text-green-700", bg: "bg-green-50", xls: "FFDCFCE7", xlsText: "FF166534" },
  falta: { code: "A", text: "text-red-700", bg: "bg-red-50", xls: "FFFEE2E2", xlsText: "FF991B1B" },
  justificado: { code: "J", text: "text-blue-700", bg: "bg-blue-50", xls: "FFDBEAFE", xlsText: "FF1E3A8A" },
  sin: { code: "·", text: "text-gray-300", bg: "", xls: null, xlsText: "FF9CA3AF" },
};

export default function ReporteAsistenciaModal({
  open,
  onOpenChange,
  idEmpresa,
  fechaInicio,
  fechaFin,
  filtroDepartamento = [],
  filtroEmpleado = "",
  rangoEtiqueta = "",
}) {
  const [cargando, setCargando] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [unidad, setUnidad] = useState("todas");
  const [exportando, setExportando] = useState(null); // 'excel' | 'pdf' | null

  // Días del rango (inclusive).
  const dias = useMemo(() => {
    if (!fechaInicio || !fechaFin) return [];
    const out = [];
    let cursor = dayjs(fechaInicio);
    const fin = dayjs(fechaFin);
    let guard = 0;
    while ((cursor.isBefore(fin) || cursor.isSame(fin, "day")) && guard < 400) {
      out.push(cursor);
      cursor = cursor.add(1, "day");
      guard += 1;
    }
    return out;
  }, [fechaInicio, fechaFin]);

  // Carga de todos los registros del rango (todas las páginas).
  useEffect(() => {
    if (!open || !idEmpresa) return;
    let cancel = false;
    const cargar = async () => {
      setCargando(true);
      try {
        const base = new URLSearchParams({
          empresa: String(idEmpresa),
          fechaInicio: fechaInicio || "",
          fechaFin: fechaFin || "",
          limit: "500",
        });
        if (filtroEmpleado) base.append("filtroEmpleado", filtroEmpleado);
        if (Array.isArray(filtroDepartamento) && filtroDepartamento.length)
          base.append("filtroDepartamento", JSON.stringify(filtroDepartamento));

        const p1 = new URLSearchParams(base);
        p1.set("page", "1");
        const first = await fetcherWithToken(
          `/checador/asistencias?${p1.toString()}`,
        );
        let rows = Array.isArray(first?.registros) ? first.registros : [];
        const totalPages = Number(first?.totalPages || 1);
        for (let p = 2; p <= totalPages; p += 1) {
          const pn = new URLSearchParams(base);
          pn.set("page", String(p));
          const d = await fetcherWithToken(
            `/checador/asistencias?${pn.toString()}`,
          );
          if (Array.isArray(d?.registros)) rows = rows.concat(d.registros);
        }
        if (!cancel) setRegistros(rows);
      } catch (e) {
        if (!cancel) {
          setRegistros([]);
          enqueueSnackbar("No se pudo cargar el reporte de asistencia", {
            variant: "error",
          });
        }
      } finally {
        if (!cancel) setCargando(false);
      }
    };
    cargar();
    return () => {
      cancel = true;
    };
  }, [open, idEmpresa, fechaInicio, fechaFin, filtroEmpleado, filtroDepartamento]);

  // Pivote: empleado -> { info, diasMap: {YYYY-MM-DD: tipo} }
  const empleados = useMemo(() => {
    const mapa = new Map();
    registros.forEach((r) => {
      const nombre = `${r.nombre || ""} ${r.apellido_paterno || ""} ${
        r.apellido_materno || ""
      }`
        .trim()
        .replace(/\s+/g, " ");
      const key = r.nip || nombre;
      if (!key) return;
      if (!mapa.has(key)) {
        mapa.set(key, {
          key,
          nombre,
          nip: r.nip || "",
          departamento: r.departamento || "",
          unidad: r.unidad_negocio || r.sucursal || "",
          diasMap: {},
        });
      }
      const emp = mapa.get(key);
      const fkey = dayjs.tz(r.fecha, DB_TZ).format("YYYY-MM-DD");
      const tipo = tipoDeRegistro(r);
      // Precedencia por si hay varios movimientos el mismo día.
      if (
        !emp.diasMap[fkey] ||
        PRECEDENCIA[tipo] > PRECEDENCIA[emp.diasMap[fkey]]
      ) {
        emp.diasMap[fkey] = tipo;
      }
    });
    let lista = Array.from(mapa.values());
    if (unidad !== "todas")
      lista = lista.filter((e) => (e.unidad || "—") === unidad);
    lista.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
    return lista.map((e) => {
      const faltas = dias.reduce(
        (acc, d) =>
          acc + (e.diasMap[d.format("YYYY-MM-DD")] === "falta" ? 1 : 0),
        0,
      );
      return { ...e, faltas };
    });
  }, [registros, dias, unidad]);

  const unidadesDisponibles = useMemo(() => {
    const set = new Set();
    registros.forEach((r) =>
      set.add(r.unidad_negocio || r.sucursal || "—"),
    );
    return Array.from(set).filter(Boolean).sort();
  }, [registros]);

  const celdaDe = (emp, dia) =>
    CELDA[emp.diasMap[dia.format("YYYY-MM-DD")] || "sin"];

  // ——— Exportar a Excel ———
  const exportarExcel = async () => {
    if (!empleados.length) return;
    try {
      setExportando("excel");
      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Asistencia");

      const header = ["No.", "Nombre completo", ...dias.map(
        (d) => `${d.format("DD")} ${LETRA_DIA[d.day()]}`,
      ), "Faltas"];
      ws.addRow(header);
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1F2937" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      empleados.forEach((emp, i) => {
        const fila = [
          i + 1,
          emp.nombre,
          ...dias.map((d) => CELDA[emp.diasMap[d.format("YYYY-MM-DD")] || "sin"].code),
          emp.faltas,
        ];
        const row = ws.addRow(fila);
        dias.forEach((d, idx) => {
          const tipo = emp.diasMap[d.format("YYYY-MM-DD")] || "sin";
          const c = CELDA[tipo];
          const cell = row.getCell(idx + 3);
          cell.alignment = { horizontal: "center" };
          cell.font = { bold: true, color: { argb: c.xlsText } };
          if (c.xls)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: c.xls },
            };
        });
        row.getCell(1).alignment = { horizontal: "center" };
        row.getCell(header.length).alignment = { horizontal: "center" };
        row.getCell(header.length).font = { bold: true };
      });

      ws.getColumn(1).width = 5;
      ws.getColumn(2).width = 30;
      for (let i = 3; i <= dias.length + 2; i += 1) ws.getColumn(i).width = 4.5;
      ws.getColumn(dias.length + 3).width = 8;

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `asistencia_${fechaInicio}_a_${fechaFin}.xlsx`,
      );
    } catch (e) {
      enqueueSnackbar("No se pudo exportar a Excel", { variant: "error" });
    } finally {
      setExportando(null);
    }
  };

  // ——— Exportar a PDF ———
  const exportarPDF = async () => {
    if (!empleados.length) return;
    try {
      setExportando("pdf");
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.autoTable || autoTableModule.default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(12);
      doc.text(`Reporte de asistencia · ${fechaInicio} a ${fechaFin}`, 10, 10);

      const head = [
        ["No.", "Nombre completo", ...dias.map(
          (d) => `${d.format("DD")}\n${LETRA_DIA[d.day()]}`,
        ), "Faltas"],
      ];
      const body = empleados.map((emp, i) => [
        i + 1,
        emp.nombre,
        ...dias.map((d) => CELDA[emp.diasMap[d.format("YYYY-MM-DD")] || "sin"].code),
        emp.faltas,
      ]);

      const rgb = { presente: [22, 101, 52], falta: [153, 27, 27], justificado: [30, 58, 138], sin: [156, 163, 175] };
      const fill = { presente: [220, 252, 231], falta: [254, 226, 226], justificado: [219, 234, 254] };

      autoTable(doc, {
        head,
        body,
        startY: 14,
        theme: "grid",
        styles: { fontSize: 5.5, halign: "center", cellPadding: 0.6 },
        headStyles: { fillColor: [31, 41, 55], fontSize: 5.5 },
        columnStyles: { 1: { halign: "left", cellWidth: 32 } },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const first = 2;
          const last = dias.length + 1;
          if (data.column.index >= first && data.column.index <= last) {
            const emp = empleados[data.row.index];
            const d = dias[data.column.index - first];
            const tipo = emp.diasMap[d.format("YYYY-MM-DD")] || "sin";
            data.cell.styles.textColor = rgb[tipo];
            if (fill[tipo]) data.cell.styles.fillColor = fill[tipo];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      doc.save(`asistencia_${fechaInicio}_a_${fechaFin}.pdf`);
    } catch (e) {
      enqueueSnackbar("No se pudo exportar a PDF", { variant: "error" });
    } finally {
      setExportando(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-hidden p-0 sm:max-w-[95vw]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-extrabold">
            Reporte de asistencia (matriz)
          </DialogTitle>
          <p className="text-[12.5px] text-gray-500">
            {rangoEtiqueta ? `${rangoEtiqueta} · ` : ""}
            {fechaInicio} a {fechaFin}
          </p>
        </DialogHeader>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2.5 px-6 pb-3">
          <Select value={unidad} onValueChange={setUnidad}>
            <SelectTrigger className="h-9 w-[220px] rounded-xl border-gray-200 text-[13px] font-medium">
              <SelectValue placeholder="Unidad de negocio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las unidades</SelectItem>
              {unidadesDisponibles.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <div className="flex items-center gap-3 text-[11.5px] font-medium text-gray-500">
            <span><b className="text-green-700">P</b> Presente</span>
            <span><b className="text-red-700">A</b> Falta injustificada</span>
            <span><b className="text-blue-700">J</b> Justificado</span>
          </div>

          <Button
            variant="outline"
            onClick={exportarExcel}
            disabled={cargando || exportando !== null || !empleados.length}
            className="h-9 rounded-xl border-gray-200 font-semibold text-gray-700"
          >
            {exportando === "excel" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            )}
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={exportarPDF}
            disabled={cargando || exportando !== null || !empleados.length}
            className="h-9 rounded-xl border-gray-200 font-semibold text-gray-700"
          >
            {exportando === "pdf" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-1.5 h-4 w-4" />
            )}
            PDF
          </Button>
        </div>

        {/* Matriz */}
        <div className="max-h-[70vh] overflow-auto border-t border-gray-100">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando registros…
            </div>
          ) : !empleados.length ? (
            <div className="py-16 text-center text-gray-400">
              No hay registros en el rango seleccionado.
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10 bg-[#1f2937] text-white">
                <tr>
                  <th className="sticky left-0 z-20 bg-[#1f2937] px-2 py-1.5 text-center">
                    No.
                  </th>
                  <th className="sticky left-[42px] z-20 bg-[#1f2937] px-2 py-1.5 text-left">
                    Nombre completo
                  </th>
                  {dias.map((d) => (
                    <th
                      key={d.format("YYYY-MM-DD")}
                      className="px-1 py-1.5 text-center font-semibold"
                    >
                      <div>{d.format("DD")}</div>
                      <div className="text-[9px] opacity-80">
                        {LETRA_DIA[d.day()]}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-center">Faltas</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((emp, i) => (
                  <tr key={emp.key} className="odd:bg-white even:bg-gray-50/60">
                    <td className="sticky left-0 z-10 bg-inherit px-2 py-1 text-center text-gray-500">
                      {i + 1}
                    </td>
                    <td className="sticky left-[42px] z-10 bg-inherit whitespace-nowrap px-2 py-1 font-medium text-gray-900">
                      {emp.nombre}
                    </td>
                    {dias.map((d) => {
                      const c = celdaDe(emp, d);
                      return (
                        <td
                          key={d.format("YYYY-MM-DD")}
                          className={`px-1 py-1 text-center font-bold ${c.text} ${c.bg}`}
                        >
                          {c.code}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center font-bold text-gray-900">
                      {emp.faltas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
