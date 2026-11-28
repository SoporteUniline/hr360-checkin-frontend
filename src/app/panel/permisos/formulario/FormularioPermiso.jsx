"use client";

// Permiso EN PÁGINA, no en ventana (28/11/2026, pedido del dueño: «pasar a página propia los dos formularios grandes que
// todavía son ventana»; sistema de diseño en docs/sistema-diseno.md). Antes era PermisoDialog.jsx.
//   - Nuevo  (/panel/permisos/nuevo):        para una o varias personas, por días completos o por horas.
//   - Editar (/panel/permisos/[id]/editar):  una persona; además cambia el estado (y al cancelar con días ya pasados
//     pregunta qué tipo de registro les queda, en la ventanita de siempre).
// Sin pasos guiados: es una sola idea (quién, qué pasó, cuándo) de 6 a 9 datos que se leen de un vistazo en una página.
// Cancelar o «← Permisos» regresan a donde estaba la persona (?volver=, por omisión la lista); si hay cambios sin
// guardar, se pregunta antes (useGuardiaSalida). Al guardar regresa allá con el aviso de éxito.
// La lógica (validar, qué se manda, goce y horas del motivo) es la misma de la ventana: usePermisoFormulario.js.
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Search } from "lucide-react";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import {
  BarraAccionesFormulario, CampoFormulario, EncabezadoPagina, Lista, PaginaFormulario, SeccionFormulario, CLASE_TEXTO_LARGO, claseControl,
} from "@/components/formulario";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import CamposQuePaso from "../CamposQuePaso";
import CamposPermisoHoras from "../CamposPermisoHoras";
import PermisoCancelacionDiasPasadosDialog from "../PermisoCancelacionDiasPasadosDialog";
import usePermisoFormulario from "./usePermisoFormulario";

const ESTADOS = ["Pendiente", "Aprobado", "Rechazado", "Cancelado"];

/**
 * editItem: el permiso a editar (null = nuevo). idEmpresa: la unidad elegida en la lista («all» = todas).
 * tiposPermiso: catálogo de tipos de registro. festivosSet: festivos (para la ventanita de días pasados).
 * volverA: ruta a la que se regresa al guardar o cancelar.
 */
export default function FormularioPermiso({ editItem = null, idEmpresa = "all", tiposPermiso = [], festivosSet = new Set(), volverA }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { dataUser } = useAuth() ?? {};
  const f = usePermisoFormulario({ editItem, idEmpresa, tiposPermiso });
  const { isEdit, form, setForm } = f;
  const errores = useRef(null);

  // La lista y el calendario de Permisos se vuelven a pedir al regresar (antes lo hacía onSaved de la ventana).
  const refrescarListas = () => mutate((clave) => typeof clave === "string" && clave.startsWith("/checador/solicitudes-permiso"));
  const guardar = async () => {
    const ok = await f.guardar();
    if (ok) refrescarListas();
    else setTimeout(() => errores.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return ok;
  };
  // «Guardar y salir» del aviso de salida.
  const confirmarSalida = useGuardiaSalida({ hayCambios: f.sucio, guardar });
  // Mientras hay cambios, la guardia deja una entrada extra en el historial: se REEMPLAZA en lugar de agregar otra
  // encima (igual que el contrato, FormularioContrato.jsx).
  const irTrasGuardar = () => (window.history.state?.__cambiosPendientes ? router.replace(volverA) : router.push(volverA));
  const alGuardar = async () => {
    if (f.loading) return;
    if (await guardar()) irTrasGuardar();
  };
  const cancelar = () => confirmarSalida(({ reemplazar }) => (reemplazar ? router.replace(volverA) : router.push(volverA)), { navega: true });

  const empresas = (dataUser?.empresas_detalle ?? []).map((e) => ({ value: String(e.id_empresa), label: e.nombre }));
  const hayError = f.errors.length > 0;
  // Si el permiso está Aprobado, solo se puede pasar a Cancelado (solicitudPermisoController.actualizarEstado sincroniza
  // las asistencias). Su estado actual aparece en la lista para que se lea, pero no es un cambio.
  const aprobado = (editItem?.estado || form.estado) === "Aprobado";
  const estados = aprobado
    ? [{ value: "Aprobado", label: "Aprobado (como está)" }, { value: "Cancelado", label: "Cancelado" }]
    : ESTADOS.map((e) => ({ value: e, label: e }));
  const elegidos = f.empleadoIds.length;

  const encabezado = (
    <EncabezadoPagina
      completo
      volver={{ href: volverA, texto: volverA === "/panel/permisos" ? "Permisos" : "Volver" }}
      titulo={isEdit ? "Editar permiso" : "Nuevo permiso"}
      descripcion={isEdit
        ? `${editItem?.empleado_nombre ? `${editItem.empleado_nombre.trim()} · ` : ""}Actualiza la solicitud y su estado.`
        : "Crea una solicitud de permiso para uno o varios empleados."}
    />
  );
  const barra = (
    <BarraAccionesFormulario
      cancelar={{ onClick: cancelar, deshabilitado: f.loading }}
      principal={{ texto: isEdit ? "Guardar cambios" : "Guardar permiso", onClick: alGuardar, cargando: f.loading }}
      aviso={f.sucio ? <span data-sin-guardar className="font-medium text-estado-aviso-texto">Tienes cambios sin guardar.</span> : null}
    />
  );

  return (
    <PaginaFormulario data-vista="formulario-permiso" data-modo={isEdit ? "editar" : "nuevo"} encabezado={encabezado} barra={barra}>
      <div data-formulario-grande className="mx-auto flex w-full max-w-4xl flex-col gap-4 lg:gap-6">
        {hayError ? (
          <div ref={errores} role="alert" data-errores-permiso className="scroll-mt-4 rounded-seccion border border-peligro-borde bg-estado-error px-4 py-3.5 text-estado-error-texto">
            <p className="m-0 font-bold">Corrige lo siguiente:</p>
            <ul className="m-0 mt-2 list-disc space-y-1 pl-6">
              {f.errors.map((er, i) => <li key={`err-${i}`}>{er}</li>)}
            </ul>
          </div>
        ) : null}

        <SeccionFormulario titulo={isEdit ? "Empresa y persona" : "Empresa y personas"} columnas={1}
          descripcion={isEdit ? null : "Puedes elegir a varias personas: a cada una se le registra el mismo permiso."}>
          <CampoFormulario id="permiso-empresa" etiqueta="Empresa" obligatorio ayuda={isEdit ? "La empresa de un permiso ya creado no se cambia." : null}>
            {(p) => (
              <Lista {...p} opciones={empresas} valor={f.idEmpresaSeleccionada} onCambio={f.cambiarEmpresa}
                vacio={empresas.length ? "Selecciona empresa…" : "No hay empresas disponibles"}
                disabled={isEdit} // No permitimos cambiar de empresa en un permiso ya creado
              />
            )}
          </CampoFormulario>

          {isEdit ? (
            <CampoFormulario id="permiso-empleado" etiqueta="Empleado" obligatorio>
              {(p) => <Lista {...p} opciones={f.empleados.map((e) => ({ value: e.id, label: e.nombre }))} valor={f.empleadoId} onCambio={f.setEmpleadoId} />}
            </CampoFormulario>
          ) : (
            <div className="flex min-w-0 flex-col gap-2" data-campo="permiso-empleados">
              <label htmlFor="permiso-buscar-empleado" className="text-etiqueta font-semibold text-texto">
                Empleados<span className="text-peligro-texto" aria-hidden="true"> *</span>
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-texto-secundario" aria-hidden="true" />
                <input id="permiso-buscar-empleado" type="search" placeholder="Buscar por nombre…" value={f.empleadosBusqueda}
                  onChange={(e) => f.setEmpleadosBusqueda(e.target.value)} className={claseControl(null, "pl-12")}
                  aria-describedby="permiso-empleados-ayuda" disabled={!f.idEmpresaSeleccionada} />
              </div>
              <p id="permiso-empleados-ayuda" data-chico className="m-0 text-ayuda text-texto-secundario">
                {!f.idEmpresaSeleccionada ? "Primero elige la empresa." : elegidos ? `${elegidos} ${elegidos === 1 ? "persona elegida" : "personas elegidas"}.` : "Marca a cada persona a la que le aplica."}
              </p>
              {f.idEmpresaSeleccionada ? (
                <ul aria-label="Empleados" className="m-0 max-h-80 list-none divide-y divide-borde overflow-auto rounded-boton border border-borde-campo bg-white p-0">
                  {f.filteredEmpleados.length === 0 ? (
                    <li className="px-4 py-3 text-texto-secundario">{f.empleados.length ? "Nadie con ese nombre." : "Cargando empleados…"}</li>
                  ) : f.filteredEmpleados.map((e) => {
                    const checked = f.empleadoIds.includes(e.id);
                    return (
                      <li key={`emp-${e.id}`}>
                        <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2", checked ? "bg-seleccion font-semibold text-seleccion-texto" : "text-texto")}>
                          <input type="checkbox" className="size-5 shrink-0 accent-brand" checked={checked} onChange={() => f.alternarEmpleado(e.id)} />
                          <span className="min-w-0 break-words">{e.nombre}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          )}
        </SeccionFormulario>

        <SeccionFormulario titulo="Razón del permiso" descripcion="El motivo dice si el día es con o sin goce y qué pasa con las horas." columnas={1}>
          {/* Qué pasó + Motivo (el goce y las horas vienen del motivo). */}
          <CamposQuePaso grande tipos={tiposPermiso} idTipo={form.id_tipo_permiso} onTipo={f.elegirTipo} motivos={f.dataMotivos}
            par={form.par} onPar={f.cambiarPar} errorMotivo={hayError} />
        </SeccionFormulario>

        <SeccionFormulario titulo="Cuándo" columnas={1}>
          {/* Días completos o por horas (si el tipo abarca parte del día, ya lo dice el tipo). */}
          {f.parcial ? null : (
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-etiqueta font-semibold text-texto" aria-hidden="true">Duración</span>
              <div className="flex w-full flex-col gap-2 sm:flex-row" role="radiogroup" aria-label="Duración del permiso">
                {[["dias", "Días completos"], ["horas", "Por horas"]].map(([valor, texto]) => (
                  <button key={valor} type="button" role="radio" aria-checked={form.modalidad === valor}
                    onClick={() => setForm((x) => ({ ...x, modalidad: valor }))}
                    className={cn("min-h-12 flex-1 rounded-boton border px-4 text-cuerpo transition-colors sm:flex-none sm:min-w-48",
                      form.modalidad === valor ? "border-2 border-brand bg-seleccion font-semibold text-seleccion-texto" : "border-borde-campo bg-white text-texto-boton hover:border-brand")}>
                    {texto}
                  </button>
                ))}
              </div>
            </div>
          )}

          {f.porHoras ? (
            <CamposPermisoHoras grande form={form} setForm={setForm} tipoFijo={f.parcial}
              horas={f.parcial && f.ap.motivo ? { valor: f.ap.horas ?? "reponen", bloqueado: !f.ap.r.horasCambian, onChange: f.cambiarHoras } : null} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CampoFormulario id="permiso-fecha-inicio" etiqueta="Fecha inicio" obligatorio>
                {(p) => <input {...p} type="date" value={form.fecha_inicio} onChange={(e) => setForm((x) => ({ ...x, fecha_inicio: e.target.value }))} />}
              </CampoFormulario>
              <CampoFormulario id="permiso-fecha-fin" etiqueta="Fecha fin" obligatorio>
                {(p) => <input {...p} type="date" value={form.fecha_fin} min={form.fecha_inicio || undefined} onChange={(e) => setForm((x) => ({ ...x, fecha_fin: e.target.value }))} />}
              </CampoFormulario>
            </div>
          )}
        </SeccionFormulario>

        {isEdit ? (
          <SeccionFormulario titulo="Estado" columnas={1}
            descripcion={aprobado ? "Un permiso aprobado solo se puede cancelar." : "Aprobar, rechazar o cancelar se aplica al guardar."}>
            <CampoFormulario id="permiso-estado" etiqueta="Estado de la solicitud">
              {(p) => <Lista {...p} opciones={estados} valor={form.estado} onCambio={f.handleEstadoChange} />}
            </CampoFormulario>
          </SeccionFormulario>
        ) : null}

        <SeccionFormulario titulo="Notas" columnas={1}>
          <CampoFormulario id="permiso-observaciones" etiqueta="Observaciones" ayuda="Opcional.">
            {(p) => <textarea {...p} rows={4} className={cn(p.className, CLASE_TEXTO_LARGO)} placeholder="Describe el motivo del permiso…"
              value={form.motivo} onChange={(e) => setForm((x) => ({ ...x, motivo: e.target.value }))} />}
          </CampoFormulario>
        </SeccionFormulario>
      </div>

      {/* Ventanita requerida si se intenta cancelar con días ya pasados (una sola decisión: se queda como ventana). */}
      <PermisoCancelacionDiasPasadosDialog
        open={f.openCancelDiasPasados}
        setOpen={f.cambiarVentanaDiasPasados}
        fechasPasadas={f.fechasPasadasPendientes}
        tiposRegistro={f.tiposRegistro}
        festivosSet={festivosSet}
        onConfirm={f.confirmarDiasPasados}
      />
    </PaginaFormulario>
  );
}
