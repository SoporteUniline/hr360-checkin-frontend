// debug/page.jsx
// Página de depuración para verificar que los campos del reporte personalizado
// se mapean correctamente contra datos reales del API.
// Accesible en: /panel/reportes-personalizados/debug
// NO incluir en sidebar ni en producción; es una herramienta de desarrollo.

"use client";

import { useState } from "react";
import axios from "@/lib/axios";
import {
  _transformarAsistencia,
  _transformarReloj,
} from "@/hooks/useReportePersonalizado";

// ─── Columnas a inspeccionar por fuente ──────────────────────────────────────

const CAMPOS_ASISTENCIA = [
  "nombre", "apellido_paterno", "apellido_materno", "nip", "departamento",
  "unidad_negocio", "fecha", "entrada", "salida", "hrs_debia", "hrs_trabajo",
  "diferencia_horas", "estadoAsistencia", "estado", "tipo_registro_nombre",
  "correccion", "autorizado_por", "hrs_extra", "forma_pago_extras",
  "extras_autorizadas_por", "hrs_comida", "goce_sueldo", "es_festivo",
  "es_domingo", "pago_triple", "prima_dominical", "porcentaje_dia_festivo",
  "notas", "notas_hrs_extra",
];

const CAMPOS_RELOJ = [
  "nombre_empleado", "nip", "empresa_nombre", "departamento", "fecha",
  "entrada", "salida", "entrada_corregida", "salida_corregida", "duracion",
  "estado", "tipo_cierre", "latitud_entrada", "longitud_entrada",
  "latitud_salida", "longitud_salida",
];

// Campos del API crudo que corresponden a cada campo del reporte (para mostrar raw)
const RAW_CAMPOS_ASISTENCIA = [
  "nombre", "apellido_paterno", "apellido_materno", "nip", "departamento",
  "empresa_nombre", "fecha", "entrada", "salida",
  "hora_entrada_programada", "hora_salida_programada",
  "estadoAsistencia", "estado", "tipo_registro_nombre",
  "correccion", "nombre_autorizador", "hrs_extra", "forma_pago_extras",
  "nombre_extra_autorizador", "hrs_comida", "goce_sueldo", "es_festivo",
  "es_domingo", "pago_triple", "prima_dominical", "porcentaje_dia_festivo",
  "notas", "notas_hrs_extra", "zona_horaria",
];

const RAW_CAMPOS_RELOJ = [
  "nombre", "apellido_paterno", "nombre_empresa", "departamento",
  "fecha", "entrada", "salida", "entrada_corregida", "salida_corregida",
  "estado", "tipo_cierre", "latitud_entrada", "longitud_entrada",
  "latitud_salida", "longitud_salida", "zona_horaria",
];

// ─── Helpers de presentación ──────────────────────────────────────────────────

function celda(val) {
  if (val === null || val === undefined) return { text: "null", clase: "text-gray-400 italic" };
  if (val === "") return { text: '""', clase: "text-gray-400 italic" };
  return { text: String(val), clase: "" };
}

function celdaTransformada(val) {
  if (val === "—") return { text: "—", clase: "text-gray-400" };
  return { text: String(val), clase: "text-green-700 font-medium" };
}

function detectarProblema(rawVal, transformado) {
  // Si hay dato crudo pero el campo transformado es "—", potencial pérdida
  if ((rawVal !== null && rawVal !== undefined && rawVal !== "") && transformado === "—") {
    return true;
  }
  return false;
}

// ─── Subcomponente: tabla de inspección de una fila ──────────────────────────

function TablaInspeccion({ raw, transformado, camposTransformados, camposRaw }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-600 w-48">Campo reporte</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Dato crudo del API</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Valor transformado</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600 w-24">Estado</th>
          </tr>
        </thead>
        <tbody>
          {camposTransformados.map((campo, i) => {
            const rawKey = camposRaw[i] ?? campo;
            const rawVal = raw[rawKey];
            const transVal = transformado[campo];
            const problema = detectarProblema(rawVal, transVal);
            const { text: rawText, clase: rawClase } = celda(rawVal);
            const { text: transText, clase: transClase } = celdaTransformada(transVal);
            return (
              <tr
                key={campo}
                className={`border-t ${problema ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <td className="px-3 py-1.5 font-mono text-gray-700">{campo}</td>
                <td className={`px-3 py-1.5 font-mono ${rawClase}`}>{rawText}</td>
                <td className={`px-3 py-1.5 font-mono ${transClase}`}>{transText}</td>
                <td className="px-3 py-1.5">
                  {problema ? (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                      Perdido
                    </span>
                  ) : transVal !== "—" ? (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      OK
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReporteDebugPage() {
  const [empresa, setEmpresa] = useState("");
  const [fechaInicio, setFechaInicio] = useState("2026-06-14");
  const [fechaFin, setFechaFin] = useState("2026-06-14");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultAsistencia, setResultAsistencia] = useState(null);
  const [resultReloj, setResultReloj] = useState(null);
  const [filaActiva, setFilaActiva] = useState(0);

  async function inspeccionar() {
    if (!empresa) return;
    setLoading(true);
    setError(null);
    setResultAsistencia(null);
    setResultReloj(null);
    setFilaActiva(0);

    try {
      const [resAsistencia, resReloj] = await Promise.all([
        axios.get(
          `/checador/asistencias?empresa=${empresa}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&page=1&limit=5`,
        ),
        axios.get(
          `/checador/reloj/asistencia?empresa=${empresa}&desde=${fechaInicio}&hasta=${fechaFin}&page=1&limit=5`,
        ),
      ]);

      const rawAsistencia = resAsistencia.data?.registros ?? resAsistencia.data?.data ?? [];
      const rawReloj = resReloj.data?.registros ?? resReloj.data?.data ?? [];

      setResultAsistencia({
        raw: rawAsistencia,
        transformado: rawAsistencia.map(_transformarAsistencia),
      });
      setResultReloj({
        raw: rawReloj,
        transformado: rawReloj.map(_transformarReloj),
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Error al obtener datos");
    } finally {
      setLoading(false);
    }
  }

  const totalProblemasAsistencia =
    resultAsistencia?.raw.reduce((acc, raw, i) => {
      const trans = resultAsistencia.transformado[i];
      return (
        acc +
        CAMPOS_ASISTENCIA.filter((campo, ci) => {
          const rawKey = RAW_CAMPOS_ASISTENCIA[ci] ?? campo;
          return detectarProblema(raw[rawKey], trans[campo]);
        }).length
      );
    }, 0) ?? 0;

  const totalProblemasReloj =
    resultReloj?.raw.reduce((acc, raw, i) => {
      const trans = resultReloj.transformado[i];
      return (
        acc +
        CAMPOS_RELOJ.filter((campo, ci) => {
          const rawKey = RAW_CAMPOS_RELOJ[ci] ?? campo;
          return detectarProblema(raw[rawKey], trans[campo]);
        }).length
      );
    }, 0) ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debug: Campos del Reporte</h1>
          <p className="text-sm text-gray-500 mt-1">
            Compara el dato crudo del API con el valor que muestra el reporte. Las filas en rojo
            indican pérdida de datos en la transformación.
          </p>
        </div>
        <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-semibold border border-yellow-300">
          Solo desarrollo
        </span>
      </div>

      {/* Formulario */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej: 1"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={inspeccionar}
          disabled={!empresa || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {loading ? "Cargando..." : "Inspeccionar"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Resultados */}
      {(resultAsistencia || resultReloj) && (
        <div className="space-y-8">
          {/* Resumen global */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`rounded-xl border p-4 ${totalProblemasAsistencia > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
            >
              <p className="text-sm font-semibold text-gray-700">Asistencia</p>
              <p className="text-2xl font-bold mt-1">
                {resultAsistencia?.raw.length ?? 0} filas
              </p>
              <p className={`text-sm mt-1 ${totalProblemasAsistencia > 0 ? "text-red-600" : "text-green-600"}`}>
                {totalProblemasAsistencia > 0
                  ? `${totalProblemasAsistencia} campo(s) con posible pérdida`
                  : "Sin pérdida de datos detectada"}
              </p>
            </div>
            <div
              className={`rounded-xl border p-4 ${totalProblemasReloj > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
            >
              <p className="text-sm font-semibold text-gray-700">Reloj Checador</p>
              <p className="text-2xl font-bold mt-1">
                {resultReloj?.raw.length ?? 0} filas
              </p>
              <p className={`text-sm mt-1 ${totalProblemasReloj > 0 ? "text-red-600" : "text-green-600"}`}>
                {totalProblemasReloj > 0
                  ? `${totalProblemasReloj} campo(s) con posible pérdida`
                  : "Sin pérdida de datos detectada"}
              </p>
            </div>
          </div>

          {/* Selector de fila */}
          {resultAsistencia && resultAsistencia.raw.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">Asistencia</h2>
                <div className="flex gap-2">
                  {resultAsistencia.raw.map((raw, i) => (
                    <button
                      key={i}
                      onClick={() => setFilaActiva(i)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        filaActiva === i
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {raw.nombre ?? `Fila ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              {resultAsistencia.raw[filaActiva] && (
                <TablaInspeccion
                  raw={resultAsistencia.raw[filaActiva]}
                  transformado={resultAsistencia.transformado[filaActiva]}
                  camposTransformados={CAMPOS_ASISTENCIA}
                  camposRaw={RAW_CAMPOS_ASISTENCIA}
                />
              )}

              {/* JSON raw completo colapsable */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 select-none">
                  Ver JSON crudo completo (fila {filaActiva + 1})
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 text-green-300 rounded-lg overflow-x-auto text-xs leading-relaxed">
                  {JSON.stringify(resultAsistencia.raw[filaActiva], null, 2)}
                </pre>
              </details>
            </section>
          )}

          {resultAsistencia && resultAsistencia.raw.length === 0 && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border">
              No hay registros de asistencia para los filtros seleccionados.
            </p>
          )}

          {/* Reloj */}
          {resultReloj && resultReloj.raw.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">Reloj Checador</h2>
                <div className="flex gap-2">
                  {resultReloj.raw.map((raw, i) => (
                    <button
                      key={i}
                      onClick={() => setFilaActiva(i)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        filaActiva === i
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {raw.nombre ?? `Fila ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              {resultReloj.raw[filaActiva] && (
                <TablaInspeccion
                  raw={resultReloj.raw[filaActiva]}
                  transformado={resultReloj.transformado[filaActiva]}
                  camposTransformados={CAMPOS_RELOJ}
                  camposRaw={RAW_CAMPOS_RELOJ}
                />
              )}

              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 select-none">
                  Ver JSON crudo completo (fila {filaActiva + 1})
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 text-green-300 rounded-lg overflow-x-auto text-xs leading-relaxed">
                  {JSON.stringify(resultReloj.raw[filaActiva], null, 2)}
                </pre>
              </details>
            </section>
          )}

          {resultReloj && resultReloj.raw.length === 0 && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border">
              No hay movimientos del reloj para los filtros seleccionados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
