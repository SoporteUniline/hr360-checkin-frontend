"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        📑 Contratos y Documentos
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.activos || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Contratos activos
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.documentos || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Documentos
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.por_vencer || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Por vencer
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.vencidos || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Vencidos
            </div>
          </CardContent>
        </Card>
      </div>

      {resumen.por_vencer > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded flex items-center gap-3">
          <span>⚠️</span>
          <span className="text-sm">
            Hay <strong>{resumen.por_vencer} contrato(s) próximo(s) a vencer</strong> en los próximos 30 días.
          </span>
        </div>
      )}

      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4 mt-4 sm:mt-6">
        📄 Lista de Contratos
      </h4>

      {contratos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No hay contratos registrados para este empleado.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {contratos.map((c, index) => {
            const fechaInicio =
              !c.fecha_inicio || c.fecha_inicio === "Sin fecha" || c.fecha_inicio === "0000-00-00"
                ? "Sin fecha"
                : formatearFecha(c.fecha_inicio);
            const fechaFin =
              !c.fecha_fin || c.fecha_fin === "Indefinido"
                ? "Indefinido"
                : formatearFecha(c.fecha_fin);
            const estadoBadge =
              c.estatus && c.estatus.toLowerCase() === "activo"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800";
            const tipoContratoDisplay = c.tipo_contrato
              ? c.tipo_contrato.charAt(0).toUpperCase() + c.tipo_contrato.slice(1)
              : "Contrato";

            return (
              <AccordionItem key={c.id_contrato || index} value={`item-${index}`} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-600 text-white rounded flex items-center justify-center">
                        📄
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{tipoContratoDisplay}</span>
                          <Badge className={estadoBadge}>{c.estatus || "N/A"}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          Folio: {c.folio_contrato || "N/A"} • Vigencia: {fechaInicio} - {fechaFin}
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
                        ⬇️ PDF
                      </Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 pt-4">
                    <div>
                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-2">
                        📋 Información General
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Folio" value={c.folio_contrato} />
                        <InfoRow label="Tipo de Contrato" value={tipoContratoDisplay} />
                        <InfoRow label="Fecha Inicio" value={fechaInicio} />
                        <InfoRow label="Fecha Fin" value={fechaFin} />
                        <InfoRow
                          label="Estatus"
                          value={
                            c.estatus === "activo"
                              ? "✅ Activo"
                              : c.estatus === "terminado"
                              ? "❌ Terminado"
                              : c.estatus === "suspendido"
                              ? "⏸️ Suspendido"
                              : c.estatus || "N/A"
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-2">
                        💼 Datos del Puesto
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Puesto" value={c.puesto} />
                        <InfoRow label="Departamento" value={c.departamento} />
                        <InfoRow label="Lugar de Trabajo" value={c.lugar_trabajo} />
                        <InfoRow label="Modalidad" value={c.modalidad_trabajo} />
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-2">
                        💰 Información Salarial
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow
                          label="Salario Base"
                          value={formatearMoneda(c.salario_base) + " " + (c.moneda || "MXN")}
                        />
                        <InfoRow label="Periodicidad" value={c.periodicidad_pago} />
                        <InfoRow label="Moneda" value={c.moneda || "MXN"} />
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-2">
                        ⏰ Jornada Laboral
                      </h5>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Tipo de Jornada" value={c.tipo_jornada} />
                        <InfoRow label="Horas Semanales" value={c.horas_semanales ? `${c.horas_semanales} hrs` : "N/A"} />
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

