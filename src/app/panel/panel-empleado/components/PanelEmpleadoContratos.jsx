"use client";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  TriangleAlert,
  ClipboardList,
  Briefcase,
  CircleDollarSign,
  Clock,
  Download,
} from "lucide-react";

/**
 * Componente para mostrar los contratos del empleado
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
export default function PanelEmpleadoContratos({ datosEmpleado }) {
  if (!datosEmpleado) return null;

  const resumen = datosEmpleado.contratos?.resumen || {};
  const contratos = datosEmpleado.contratos?.lista || [];

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
        <FileText className="h-3.5 w-3.5 text-[#2563eb]" />
        Contratos y documentos
      </h3>

      {/* Mini-KPIs homologados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniKpi label="Contratos activos" value={resumen.activos || 0} />
        <MiniKpi label="Documentos" value={resumen.documentos || 0} />
        <MiniKpi label="Por vencer" value={resumen.por_vencer || 0} />
        <MiniKpi label="Vencidos" value={resumen.vencidos || 0} />
      </div>

      {resumen.por_vencer > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-amber-100 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800">
          <TriangleAlert className="h-4 w-4 flex-shrink-0" />
          <span>
            Hay{" "}
            <strong>
              {resumen.por_vencer} contrato(s) próximo(s) a vencer
            </strong>{" "}
            en los próximos 30 días.
          </span>
        </div>
      )}

      <h4 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
        <ClipboardList className="h-3.5 w-3.5 text-[#2563eb]" />
        Lista de contratos
      </h4>

      {contratos.length === 0 ? (
        <div className="rounded-[10px] border border-gray-200 bg-white p-8 text-center text-gray-500">
          No hay contratos registrados para este empleado.
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {contratos.map((c, index) => {
            const fechaInicio =
              !c.fecha_inicio ||
              c.fecha_inicio === "Sin fecha" ||
              c.fecha_inicio === "0000-00-00"
                ? "Sin fecha"
                : formatearFecha(c.fecha_inicio);
            const fechaFin =
              !c.fecha_fin || c.fecha_fin === "Indefinido"
                ? "Indefinido"
                : formatearFecha(c.fecha_fin);
            const estadoPill =
              c.estatus && c.estatus.toLowerCase() === "activo"
                ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border border-gray-200 bg-gray-50 text-gray-600";
            const tipoContratoDisplay = c.tipo_contrato
              ? c.tipo_contrato.charAt(0).toUpperCase() +
                c.tipo_contrato.slice(1)
              : "Contrato";

            return (
              <AccordionItem
                key={c.id_contrato || index}
                value={`item-${index}`}
                className="rounded-[10px] border border-gray-200 bg-white px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-semibold">
                            {tipoContratoDisplay}
                          </span>
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${estadoPill}`}
                          >
                            {c.estatus || "N/A"}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-gray-500">
                          Folio: {c.folio_contrato || "N/A"} · Vigencia:{" "}
                          {fechaInicio} - {fechaFin}
                        </p>
                      </div>
                    </div>
                    {c.url_contrato_pdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(c.url_contrato_pdf, "_blank");
                        }}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2 lg:gap-6">
                    <div>
                      <h5 className="mb-3 flex items-center gap-1.5 border-b pb-2 text-[12.5px] font-bold text-gray-900">
                        <ClipboardList className="h-3.5 w-3.5 text-[#2563eb]" />
                        Información general
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Folio" value={c.folio_contrato} />
                        <InfoRow
                          label="Tipo de Contrato"
                          value={tipoContratoDisplay}
                        />
                        <InfoRow label="Fecha Inicio" value={fechaInicio} />
                        <InfoRow label="Fecha Fin" value={fechaFin} />
                        <InfoRow
                          label="Estatus"
                          value={
                            c.estatus === "activo"
                              ? "Activo"
                              : c.estatus === "terminado"
                                ? "Terminado"
                                : c.estatus === "suspendido"
                                  ? "Suspendido"
                                  : c.estatus || "N/A"
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <h5 className="mb-3 flex items-center gap-1.5 border-b pb-2 text-[12.5px] font-bold text-gray-900">
                        <Briefcase className="h-3.5 w-3.5 text-[#2563eb]" />
                        Datos del puesto
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Puesto" value={c.puesto} />
                        <InfoRow label="Departamento" value={c.departamento} />
                        <InfoRow
                          label="Lugar de Trabajo"
                          value={c.lugar_trabajo}
                        />
                        <InfoRow
                          label="Modalidad"
                          value={c.modalidad_trabajo}
                        />
                      </div>
                    </div>
                    <div>
                      <h5 className="mb-3 flex items-center gap-1.5 border-b pb-2 text-[12.5px] font-bold text-gray-900">
                        <CircleDollarSign className="h-3.5 w-3.5 text-[#2563eb]" />
                        Información salarial
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow
                          label="Salario Base"
                          value={
                            formatearMoneda(c.salario_base) +
                            " " +
                            (c.moneda || "MXN")
                          }
                        />
                        <InfoRow
                          label="Periodicidad"
                          value={c.periodicidad_pago}
                        />
                        <InfoRow label="Moneda" value={c.moneda || "MXN"} />
                      </div>
                    </div>
                    <div>
                      <h5 className="mb-3 flex items-center gap-1.5 border-b pb-2 text-[12.5px] font-bold text-gray-900">
                        <Clock className="h-3.5 w-3.5 text-[#2563eb]" />
                        Jornada laboral
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow
                          label="Tipo de Jornada"
                          value={c.tipo_jornada}
                        />
                        <InfoRow
                          label="Horas Semanales"
                          value={
                            c.horas_semanales
                              ? `${c.horas_semanales} hrs`
                              : "N/A"
                          }
                        />
                        <InfoRow label="Horario" value={c.horario} />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function MiniKpi({ label, value }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-gray-200 bg-white p-3">
      <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-lg font-extrabold tabular-nums text-gray-900">
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-900">{value || "N/A"}</span>
    </div>
  );
}

function formatearFecha(fechaISO) {
  if (!fechaISO || fechaISO === "N/A") return "N/A";

  try {
    const fecha = new Date(fechaISO + "T00:00:00");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  } catch (e) {
    return fechaISO;
  }
}

function formatearMoneda(cantidad) {
  if (!cantidad) return "N/A";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(cantidad);
}
