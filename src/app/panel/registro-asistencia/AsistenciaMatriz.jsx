"use client";

// Vista de asistencia en matriz (empleados × días) para la misma pantalla de
// registro-asistencia. NO hace fetch: recibe los registros que la pantalla ya
// cargó con su rango y filtros. Exporta a PDF (con logo) y Excel desde el front.

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TZ = "America/Mexico_City";
// Letra de día en español (0=Dom … 6=Sáb).
const LETRA_DIA = ["D", "L", "M", "X", "J", "V", "S"];

const esVerdadero = (v) =>
  v === true ||
  v === 1 ||
  v === "1" ||
  ["si", "sí", "true", "con goce"].includes(String(v ?? "").trim().toLowerCase());

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
  if (est.includes("ausente") || est.includes("falta"))
    return esVerdadero(r.goce_sueldo) ? "justificado" : "falta";
  if (r.entrada) return "presente";
  return "sin";
};

const PRECEDENCIA = { presente: 3, justificado: 2, falta: 1, sin: 0 };
const CELDA = {
  presente: { code: "P", text: "text-green-700", bg: "bg-green-50", xls: "FFDCFCE7", xlsText: "FF166534", rgb: [22, 101, 52], fill: [220, 252, 231] },
  falta: { code: "A", text: "text-red-700", bg: "bg-red-50", xls: "FFFEE2E2", xlsText: "FF991B1B", rgb: [153, 27, 27], fill: [254, 226, 226] },
  justificado: { code: "J", text: "text-blue-700", bg: "bg-blue-50", xls: "FFDBEAFE", xlsText: "FF1E3A8A", rgb: [30, 58, 138], fill: [219, 234, 254] },
  sin: { code: "·", text: "text-gray-300", bg: "", xls: null, xlsText: "FF9CA3AF", rgb: [156, 163, 175], fill: null },
};

export default function AsistenciaMatriz({
  registros = [],
  fechaInicio,
  fechaFin,
  cargando = false,
}) {
  const [exportando, setExportando] = useState(null); // 'excel' | 'pdf' | null

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
          diasMap: {},
        });
      }
      const emp = mapa.get(key);
      const fkey = dayjs.tz(r.fecha, DB_TZ).format("YYYY-MM-DD");
      const tipo = tipoDeRegistro(r);
      if (!emp.diasMap[fkey] || PRECEDENCIA[tipo] > PRECEDENCIA[emp.diasMap[fkey]])
        emp.diasMap[fkey] = tipo;
    });

    const lista = Array.from(mapa.values());
    lista.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
    return lista.map((e) => {
      let presentes = 0;
      let faltas = 0;
      let justificados = 0;
      dias.forEach((d) => {
        const t = e.diasMap[d.format("YYYY-MM-DD")];
        if (t === "presente") presentes += 1;
        else if (t === "falta") faltas += 1;
        else if (t === "justificado") justificados += 1;
      });
      const total = presentes + faltas + justificados; // días con registro
      const pctAusencia = total ? Math.round((faltas / total) * 100) : 0;
      return { ...e, presentes, faltas, justificados, total, pctAusencia };
    });
  }, [registros, dias]);

  const celdaDe = (emp, dia) => CELDA[emp.diasMap[dia.format("YYYY-MM-DD")] || "sin"];

  // ——— Exportar a Excel ———
  const exportarExcel = async () => {
    if (!empleados.length) return;
    try {
      setExportando("excel");
      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Asistencia");

      const header = [
        "No.",
        "Nombre completo",
        ...dias.map((d) => `${d.format("DD")} ${LETRA_DIA[d.day()]}`),
        "Pres.",
        "Faltas",
        "Total",
        "% Aus.",
      ];
      ws.addRow(header);
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      empleados.forEach((emp, i) => {
        const fila = [
          i + 1,
          emp.nombre,
          ...dias.map((d) => CELDA[emp.diasMap[d.format("YYYY-MM-DD")] || "sin"].code),
          emp.presentes,
          emp.faltas,
          emp.total,
          `${emp.pctAusencia}%`,
        ];
        const row = ws.addRow(fila);
        dias.forEach((d, idx) => {
          const c = CELDA[emp.diasMap[d.format("YYYY-MM-DD")] || "sin"];
          const cell = row.getCell(idx + 3);
          cell.alignment = { horizontal: "center" };
          cell.font = { bold: true, color: { argb: c.xlsText } };
          if (c.xls)
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.xls } };
        });
        row.getCell(1).alignment = { horizontal: "center" };
        for (let k = header.length - 3; k <= header.length; k += 1)
          row.getCell(k).alignment = { horizontal: "center" };
      });

      ws.getColumn(1).width = 5;
      ws.getColumn(2).width = 30;
      for (let i = 3; i <= dias.length + 2; i += 1) ws.getColumn(i).width = 4.5;
      for (let i = dias.length + 3; i <= dias.length + 6; i += 1)
        ws.getColumn(i).width = 7;

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `asistencia_${fechaInicio}_a_${fechaFin}.xlsx`);
    } catch (e) {
      enqueueSnackbar("No se pudo exportar a Excel", { variant: "error" });
    } finally {
      setExportando(null);
    }
  };

  // ——— Exportar a PDF (con logo ADAMIA) ———
  const exportarPDF = async () => {
    if (!empleados.length) return;
    try {
      setExportando("pdf");
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.autoTable || autoTableModule.default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Encabezado con logo + degradado de marca.
      let startY = 12;
      try {
        const logo = await fetchImageAsDataUrl("/assets/adamia.png");
        if (logo) doc.addImage(logo, "PNG", 10, 6, 26, 9);
      } catch {
        // sin logo, seguimos
      }
      doc.setFontSize(13);
      doc.setTextColor(31, 41, 55);
      doc.text("Reporte de asistencia", 40, 11);
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Del ${dayjs(fechaInicio).format("DD/MM/YYYY")} al ${dayjs(fechaFin).format("DD/MM/YYYY")}`,
        40,
        16,
      );
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.6);
      doc.line(10, 19, 287, 19);
      startY = 22;

      const head = [
        [
          "No.",
          "Nombre completo",
          ...dias.map((d) => `${d.format("DD")}\n${LETRA_DIA[d.day()]}`),
          "Pres.",
          "Faltas",
          "Total",
          "% Aus.",
        ],
      ];
      const body = empleados.map((emp, i) => [
        i + 1,
        emp.nombre,
        ...dias.map((d) => CELDA[emp.diasMap[d.format("YYYY-MM-DD")] || "sin"].code),
        emp.presentes,
        emp.faltas,
        emp.total,
        `${emp.pctAusencia}%`,
      ]);

      const first = 2;
      const last = dias.length + 1;
      autoTable(doc, {
        head,
        body,
        startY,
        theme: "grid",
        styles: { fontSize: 5.5, halign: "center", cellPadding: 0.6 },
        headStyles: { fillColor: [31, 41, 55], fontSize: 5.5 },
        columnStyles: { 1: { halign: "left", cellWidth: 32 } },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index >= first && data.column.index <= last) {
            const emp = empleados[data.row.index];
            const d = dias[data.column.index - first];
            const tipo = emp.diasMap[d.format("YYYY-MM-DD")] || "sin";
            const c = CELDA[tipo];
            data.cell.styles.textColor = c.rgb;
            if (c.fill) data.cell.styles.fillColor = c.fill;
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
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Barra del reporte */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="text-sm font-semibold text-gray-900">
          Vista matriz
          <span className="ml-2 text-[12px] font-normal text-gray-500">
            {empleados.length} empleado{empleados.length === 1 ? "" : "s"} ·{" "}
            {dias.length} día{dias.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11.5px] font-medium text-gray-500">
          <span>
            <b className="text-green-700">P</b> Presente
          </span>
          <span>
            <b className="text-red-700">A</b> Falta
          </span>
          <span>
            <b className="text-blue-700">J</b> Justificado
          </span>
        </div>

        <div className="flex-1" />

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
          onClick={exportarPDF}
          disabled={cargando || exportando !== null || !empleados.length}
          className="h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-semibold text-white"
        >
          {exportando === "pdf" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-1.5 h-4 w-4" />
          )}
          Exportar PDF
        </Button>
      </div>

      {/* Matriz */}
      <div className="max-h-[65vh] overflow-auto">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando registros…
          </div>
        ) : !empleados.length ? (
          <div className="py-16 text-center text-gray-400">
            No hay registros en el rango y filtros seleccionados.
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
                    <div className="text-[9px] opacity-80">{LETRA_DIA[d.day()]}</div>
                  </th>
                ))}
                <th className="px-2 py-1.5 text-center">Pres.</th>
                <th className="px-2 py-1.5 text-center">Faltas</th>
                <th className="px-2 py-1.5 text-center">Total</th>
                <th className="px-2 py-1.5 text-center">% Aus.</th>
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
                  <td className="px-2 py-1 text-center font-semibold text-green-700">
                    {emp.presentes}
                  </td>
                  <td className="px-2 py-1 text-center font-bold text-red-700">
                    {emp.faltas}
                  </td>
                  <td className="px-2 py-1 text-center text-gray-700">
                    {emp.total}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold text-gray-900">
                    {emp.pctAusencia}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
