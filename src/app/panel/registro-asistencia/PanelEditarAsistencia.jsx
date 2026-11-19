"use client";

// Ventana de la asistencia (clic en la fila): horario, checadas del reloj y edición juntos.
// Pedido del 19/11/2026: ventana flotante centrada, como la de turnos/horarios.
// Usa el mismo estado y guardado de useAsistenciaActions: solo se envían los campos cambiados.

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcularResumenJornada, formatearMinutos } from "@/utils/asistenciaHoras";
import { ETIQUETAS_ESTADO, FORMAS_PAGO, estadoHorasExtra } from "@/lib/asistencia/horasExtra.mjs";
import ChecadasDelDia from "./ChecadasDelDia";

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
  mutateAsistencia,
}) {
  if (!registro) return null;
  const { horaLocal, aBaseDeDatos, salidaParaHoras, mismaMarca, salidaDiaSiguiente, fechaBase } = horas;
  const { minutosTrabajados, minutosProgramados, minutosDiferencia } = calcularResumenJornada(datos);
  const extra = estadoHorasExtra(datos, zona);
  const corta = (h) => String(h ?? "").slice(0, 5);
  const horario = [registro.hora_entrada_programada, registro.hora_salida_programada].map(corta).filter(Boolean).join("–");
  const comidaHorario = [registro.hora_salida_comida_programada, registro.hora_regreso_comida_programada].map(corta).filter(Boolean).join("–");

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && handleCancelEdit()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-[960px]" data-no-row-click>
        <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
          <DialogTitle>{registro.nombre} {registro.apellido_paterno}</DialogTitle>
          <DialogDescription>
            {String(registro.fecha ?? "").slice(0, 10).split("-").reverse().join("/")}
            {registro.departamento ? ` · ${registro.departamento}` : ""}
            {registro.tipo_registro_nombre ? ` · ${registro.tipo_registro_nombre}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-5">
          <Seccion titulo="Horario del día">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Jornada</p>
                <p className="font-semibold tabular-nums text-slate-800">{horario || "Sin horario"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Comida</p>
                <p className="font-semibold tabular-nums text-slate-800">
                  {comidaHorario || (registro.hrs_comida ? `${registro.hrs_comida} h` : "Sin comida")}
                </p>
              </div>
            </div>
          </Seccion>

          <Seccion titulo="Checadas del reloj">
            <ChecadasDelDia empleado={registro} activo={abierto} mutateAsistencia={mutateAsistencia} />
            <p className="text-[11px] text-slate-400">Con el lápiz corriges una checada; la hora original del reloj queda tachada.</p>
          </Seccion>

          <Seccion titulo="Entrada y salida del día">
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

          </div>
          <div className="space-y-5">
          <Seccion titulo="Horas extra">
            {/* Solo se editan si ese día hay tiempo extra (o ya estaban autorizadas, para poder quitarlas). */}
            {extra.estado === "sin" && !Number(datos.hrs_extra) ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500">
                Sin horas extra este día: no salió después de su horario.
              </p>
            ) : (
              <>
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
              </>
            )}
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
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-between gap-2 border-t border-slate-200 px-6 py-3 sm:justify-between">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
