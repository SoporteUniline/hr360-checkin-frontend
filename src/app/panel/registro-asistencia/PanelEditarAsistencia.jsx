"use client";

// Edición de una asistencia en panel lateral (reemplaza la edición dentro de la fila).
// Usa el mismo estado y guardado de useAsistenciaActions: solo se envían los campos cambiados.

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcularResumenJornada, formatearMinutos } from "@/utils/asistenciaHoras";
import { ETIQUETAS_ESTADO, FORMAS_PAGO, estadoHorasExtra } from "@/lib/asistencia/horasExtra.mjs";

const si = (v) => Boolean(Number(v));

function Seccion({ titulo, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ label, children, nota }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      {children}
      {nota && <span className="text-[11px] font-normal text-slate-400">{nota}</span>}
    </label>
  );
}

function SiNo({ valor, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
      {[["0", "No"], ["1", "Sí"]].map(([v, t]) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => onChange(v === "1" ? 1 : 0)}
          className={`rounded-md px-3 py-1 text-xs font-semibold ${
            (si(valor) ? "1" : "0") === v ? "bg-slate-900 text-white" : "text-slate-500"
          } disabled:opacity-60`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Dato({ etiqueta, valor, clase = "" }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-slate-100 py-1.5 text-sm">
      <span className="text-slate-500">{etiqueta}</span>
      <b className={`tabular-nums ${clase}`}>{valor}</b>
    </div>
  );
}

export default function PanelEditarAsistencia({
  abierto,
  registro,
  datos,
  zona,
  horas,
  empleados,
  tiposPermiso,
  avisoDe,
  isSaving,
  handleFieldChange,
  handleSaveClick,
  handleCancelEdit,
  handleRestoreOriginal,
}) {
  if (!registro) return null;
  const { horaLocal, aBaseDeDatos, salidaParaHoras, mismaMarca, salidaDiaSiguiente, fechaBase } = horas;
  const { minutosTrabajados, minutosProgramados, minutosDiferencia } = calcularResumenJornada(datos);
  const extra = estadoHorasExtra(datos, zona);
  const horario = [registro.hora_entrada_programada, registro.hora_salida_programada]
    .map((h) => String(h ?? "").slice(0, 5))
    .filter(Boolean)
    .join("–");

  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && handleCancelEdit()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-[460px]" data-no-row-click>
        <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
          <SheetTitle>{registro.nombre} {registro.apellido_paterno}</SheetTitle>
          <SheetDescription>
            {String(registro.fecha ?? "").slice(0, 10).split("-").reverse().join("/")}
            {horario && ` · Horario ${horario}`}
            {registro.hrs_comida ? ` · comida ${registro.hrs_comida} h` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <Seccion titulo="Checadas">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Entrada">
                <Input
                  type="time"
                  aria-label="Entrada"
                  value={horaLocal(datos.entrada)}
                  onChange={(e) => {
                    const hora = e.target.value;
                    handleFieldChange("entrada", hora ? aBaseDeDatos(fechaBase, hora) : null);
                    // Si ya hay salida, se recalcula su día respecto a la nueva entrada.
                    const horaSalida = horaLocal(datos.salida);
                    if (hora && horaSalida) {
                      const nuevaSalida = salidaParaHoras(hora, horaSalida);
                      if (!mismaMarca(nuevaSalida, datos.salida)) handleFieldChange("salida", nuevaSalida);
                    }
                  }}
                />
              </Campo>
              <Campo label="Salida" nota={salidaDiaSiguiente(datos) ? "+1 día" : null}>
                <Input
                  type="time"
                  aria-label="Salida"
                  value={horaLocal(datos.salida)}
                  onChange={(e) => {
                    const hora = e.target.value;
                    handleFieldChange("salida", hora ? salidaParaHoras(horaLocal(datos.entrada), hora) : null);
                  }}
                />
              </Campo>
            </div>
            <p className="text-[11px] text-slate-400">
              Si cambias una hora, la original queda guardada y el registro se marca «Editado».
            </p>
          </Seccion>

          <Seccion titulo="Cálculo (automático)">
            <Dato etiqueta="Trabajado" valor={formatearMinutos(minutosTrabajados)} />
            <Dato etiqueta="Programado" valor={formatearMinutos(minutosProgramados)} />
            <Dato
              etiqueta="Diferencia"
              valor={formatearMinutos(minutosDiferencia, { signo: true })}
              clase={minutosDiferencia < 0 ? "text-red-600" : minutosDiferencia > 0 ? "text-green-600" : ""}
            />
          </Seccion>

          <Seccion titulo="Horas extra">
            <Dato
              etiqueta={ETIQUETAS_ESTADO[extra.estado]}
              valor={extra.minutos > 0 ? formatearMinutos(extra.minutos) : "—"}
            />
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Autorizadas">
                <SiNo valor={datos.hrs_extra} onChange={(v) => handleFieldChange("hrs_extra", v)} />
              </Campo>
              <Campo label="Forma de pago">
                <select
                  aria-label="Forma de pago"
                  value={datos.forma_pago_extras || ""}
                  onChange={(e) => handleFieldChange("forma_pago_extras", e.target.value || null)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                >
                  <option value="">—</option>
                  {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Campo>
            </div>
            <Campo label="Autorizadas por">
              <Select
                value={datos.extras_autorizadas_por ? String(datos.extras_autorizadas_por) : ""}
                onValueChange={(v) => handleFieldChange("extras_autorizadas_por", v)}
              >
                <SelectTrigger aria-label="Autorizadas por"><SelectValue placeholder="Autorizadas por" /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {empleados?.map((emp) => (
                    <SelectItem key={emp.id_empleado} value={String(emp.id_empleado)}>
                      {emp.nombre} {emp.apellido_paterno}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Nota de horas extra">
              <Textarea
                rows={2}
                value={datos.notas_hrs_extra || ""}
                onChange={(e) => handleFieldChange("notas_hrs_extra", e.target.value)}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Registro">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tipo de registro" nota="Asistió y Goce los define el tipo.">
                <Select
                  value={datos.id_tipo_permiso ? String(datos.id_tipo_permiso) : ""}
                  onValueChange={(val) => {
                    const t = tiposPermiso?.tiposPermiso?.find((tipo) => String(tipo.id) === val);
                    handleFieldChange("id_tipo_permiso", t?.id);
                    handleFieldChange("tipo_registro_nombre", t?.nombre || "");
                    handleFieldChange("asistencia", t?.cuenta_como_asistencia);
                    handleFieldChange("goce_sueldo", t?.goce_sueldo);
                  }}
                >
                  <SelectTrigger aria-label="Tipo de registro"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {tiposPermiso?.tiposPermiso?.map((tipo) => (
                      <SelectItem key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Hrs comida">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={datos.hrs_comida || 0}
                  onChange={(e) => handleFieldChange("hrs_comida", e.target.value)}
                />
              </Campo>
            </div>
            <Campo label="Autorizado por (incidencia)">
              <Select
                value={datos.autorizado_por ? String(datos.autorizado_por) : ""}
                onValueChange={(val) => handleFieldChange("autorizado_por", val)}
              >
                <SelectTrigger aria-label="Autorizado por"><SelectValue placeholder="Autorizado por" /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="null">No requiere autorización</SelectItem>
                  {empleados?.map((emp) => (
                    <SelectItem key={emp.id_empleado} value={String(emp.id_empleado)}>
                      {emp.nombre} {emp.apellido_paterno}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Observaciones">
              <Textarea rows={2} value={datos.notas || ""} onChange={(e) => handleFieldChange("notas", e.target.value)} />
            </Campo>
          </Seccion>

          <Seccion titulo="Calendario y pagos">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Domingo" nota={avisoDe("es_domingo") || "Según la fecha del registro"}>
                <SiNo valor={datos.es_domingo} onChange={() => {}} disabled />
              </Campo>
              <Campo label="Festivo" nota={avisoDe("es_festivo") || "Según el catálogo; puedes marcar uno adicional"}>
                <SiNo valor={datos.es_festivo} onChange={(v) => handleFieldChange("es_festivo", v)} />
              </Campo>
              <Campo label="Pago triple">
                <SiNo valor={datos.pago_triple} onChange={(v) => handleFieldChange("pago_triple", v)} />
              </Campo>
              <Campo label="Prima dominical %">
                <Input type="number" step="0.1" min="0" value={datos.prima_dominical || 0}
                  onChange={(e) => handleFieldChange("prima_dominical", e.target.value)} />
              </Campo>
              <Campo label="% día festivo">
                <Input type="number" step="0.1" min="0" value={datos.porcentaje_dia_festivo || 0}
                  onChange={(e) => handleFieldChange("porcentaje_dia_festivo", e.target.value)} />
              </Campo>
            </div>
          </Seccion>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
          <div>
            {registro.valores_originales && (
              <button type="button" onClick={handleRestoreOriginal} disabled={isSaving}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                Volver al original
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCancelEdit} disabled={isSaving}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={handleSaveClick} disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
