"use client";

// Ventana de la asistencia (clic en la fila): horario, checadas del reloj y edición juntos. La abren Asistencias y Monitor.
// Usa el estado y guardado de useAsistenciaActions: solo se envían los campos cambiados. Las horas extra con su horario
// (useHorasExtraDia) se guardan con el mismo botón Guardar, antes que la asistencia; la guardia de cambios sin guardar
// pregunta al cerrar si hay algo pendiente.

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcularResumenJornada, formatearMinutos } from "@/utils/asistenciaHoras";
import { puedeAgregarComida } from "@/lib/asistencia/jornada.mjs";
import useHorasExtraDia from "@/hooks/useHorasExtraDia";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import EstadoCambios from "@/components/cambios/EstadoCambios";
import ChecadasDelDia from "./ChecadasDelDia";
import BotonAgregarComida from "./BotonAgregarComida";
import HorasExtraDia from "./HorasExtraDia";

// Campos que el panel deja editar (para saber si hay cambios sin guardar).
// Domingo, festivo, pagos y horas de comida ya no se capturan: los calcula el servidor (calendario y checadas).
const EDITABLES = ["entrada", "salida", "id_tipo_permiso", "asistencia", "goce_sueldo", "autorizado_por", "notas"];
const vacio = (v) => v == null || v === "";
const igual = (a, b) => String(a ?? "") === String(b ?? "") || (!vacio(a) && !vacio(b) && Number.isFinite(Number(a)) && Number(a) === Number(b));

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
  const extra = useHorasExtraDia({ registro, activo: abierto && Boolean(registro), zona, aBaseDeDatos: horas?.aBaseDeDatos });
  const asistenciaCambiada = Boolean(registro) && EDITABLES.some((c) => Object.hasOwn(datos ?? {}, c) && !igual(datos[c], registro[c]));
  const hayCambios = Boolean(abierto && registro) && (extra.sucio || asistenciaCambiada);
  const guardarTodo = async () => {
    if (!(await extra.guardar())) return false;
    if (extra.sucio) await mutateAsistencia?.();
    await handleSaveClick();
    return true;
  };
  const confirmarSalida = useGuardiaSalida({ hayCambios, guardar: guardarTodo });
  const cerrar = () => confirmarSalida(() => handleCancelEdit());
  if (!registro) return null;
  const { horaLocal, aBaseDeDatos, salidaParaHoras, mismaMarca, salidaDiaSiguiente, fechaBase } = horas;
  const { minutosTrabajados, minutosProgramados, minutosDiferencia } = calcularResumenJornada(datos);
  const corta = (h) => String(h ?? "").slice(0, 5);
  const horario = [registro.hora_entrada_programada, registro.hora_salida_programada].map(corta).filter(Boolean).join("–");
  const comidaHorario = [registro.hora_salida_comida_programada, registro.hora_regreso_comida_programada].map(corta).filter(Boolean).join("–");

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && cerrar()}>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-400">Con el lápiz corriges una checada; la hora original del reloj queda tachada.</p>
              {/* Agregar comida: con entrada y salida, sin comida (checada o manual) y sin una pausa real dentro de su comida.
                  El servidor aplica la misma regla. */}
              {puedeAgregarComida(registro) && (
                <BotonAgregarComida
                  variante="boton"
                  registro={registro}
                  aBaseDeDatos={aBaseDeDatos}
                  fechaBase={fechaBase}
                  onGuardado={mutateAsistencia}
                />
              )}
            </div>
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
          <Seccion titulo="Registro">
            <div className="grid gap-3">
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
            {/* Solo lectura: lo pone la ley o el catálogo de días (antes eran campos editables). */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700" data-calendario-lectura>
              <p className="font-semibold">
                {si(registro.es_festivo) ? "Festivo" : si(registro.es_domingo) ? "Domingo" : "Día normal"}
              </p>
              <p className="text-[12px] text-slate-500">
                {avisoDe("es_festivo") || avisoDe("es_domingo") || "Lo pone la ley o el catálogo de días de la empresa; no se edita aquí."}
              </p>
            </div>
          </Seccion>
          </div>
          </div>
          {/* Ancho completo: filas por día con desde, hasta, horas y motivo (Dia.dc.html). */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <Seccion titulo="Horas extra">
              <HorasExtraDia extra={extra} empleados={empleados} />
            </Seccion>
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
          <div className="flex items-center gap-2">
            <EstadoCambios hayCambios={hayCambios} />
            <button type="button" onClick={cerrar} disabled={isSaving || extra.guardando}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={guardarTodo} disabled={isSaving || extra.guardando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {isSaving || extra.guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
