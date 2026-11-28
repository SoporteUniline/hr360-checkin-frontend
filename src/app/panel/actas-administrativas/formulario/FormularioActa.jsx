"use client";

// Acta administrativa EN PÁGINA y POR PASOS (28/11/2026, pedido del dueño: «pasar a página propia los dos formularios
// grandes que todavía son ventana»; sistema de diseño en docs/sistema-diseno.md). Antes era src/components/NewActaModal.jsx.
// Pasos (lib/actas/formularioActa.mjs): Persona y tipo de acta · Qué pasó · Sanción y quién la elabora · Declaraciones ·
// Revisar y guardar. Van por pasos porque son 14 datos de cuatro temas distintos y un acta se levanta en ese orden; el
// último paso deja leer todo junto antes de guardar. La firma no va aquí: se manda a firmar desde el detalle del acta.
//   - Nueva  (/panel/actas-administrativas/nueva): «Continuar» revisa solo los datos del paso; al final «Guardar acta».
//   - Editar (/panel/actas-administrativas/[id]/editar): todos los pasos ya están listos, se salta a cualquiera y
//     «Guardar cambios» está siempre disponible.
// Cancelar o «← Actas» regresan a donde estaba la persona (?volver=, por omisión la lista); con cambios sin guardar se
// pregunta antes (useGuardiaSalida). La lógica (esquema, buscador, autollenado, lo que se manda) es la de la ventana:
// useFormularioActa.js.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Controller } from "react-hook-form";
import { PlusIcon, Search } from "lucide-react";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import {
  BarraAccionesFormulario, CampoFormulario, EncabezadoPagina, Lista, PaginaFormulario, PasosGuiados, SeccionFormulario, CLASE_TEXTO_LARGO,
} from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import NewTipoActaModal from "@/components/NewTipoActaModal";
import { cn } from "@/lib/utils";
import { vecinosDePaso } from "@/lib/formulario/pasosGuiados.mjs";
import {
  PASOS_ACTA, RUTA_ACTAS, SANCIONES, erroresPorPaso, formatearTexto, primerCampoConError, primerPasoConError, siNo,
} from "@/lib/actas/formularioActa.mjs";
import useFormularioActa from "./useFormularioActa";

// id del control de cada campo del esquema (para el foco y las pruebas).
const ID = {
  empresa: "acta-empresa", empleado: "acta-empleado", tipoActa: "acta-tipo", fechaIncidente: "acta-fecha", horaIncidente: "acta-hora",
  lugar: "acta-lugar", descripcion: "acta-descripcion", testigos: "acta-testigos", sancion: "acta-sancion", elabora: "acta-elabora",
  cargoElabora: "acta-cargo", descargo: "acta-descargo", aceptaHechos: "acta-acepta", esReincidencia: "acta-reincidencia",
};

/** mode: "create" | "edit". actaToEdit: el acta del listado. dataUser: la sesión. volverA: a dónde regresar. */
export default function FormularioActa({ mode = "create", actaToEdit = null, dataUser = null, volverA = RUTA_ACTAS }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const editar = mode === "edit";
  const f = useFormularioActa({ mode, actaToEdit, dataUser });
  const { form } = f;
  const { errors } = form.formState;
  const [paso, setPaso] = useState("persona");
  const [visitados, setVisitados] = useState([]);
  const [openNewTipoActa, setOpenNewTipoActa] = useState(false);

  const irAPaso = (clave) => {
    if (!clave || clave === paso) return;
    setVisitados((v) => (v.includes(paso) ? v : [...v, paso]));
    setPaso(clave);
    window.scrollTo({ top: 0 });
  };
  // Lleva el foco al campo con error (ya dentro de su paso).
  const enfocar = (campo) => setTimeout(() => document.getElementById(ID[campo])?.focus(), 60);
  const { anterior, siguiente } = vecinosDePaso(PASOS_ACTA, paso);

  // La lista de actas se vuelve a pedir al regresar (antes lo hacía refetch de la ventana).
  const refrescarLista = () => mutate((clave) => typeof clave === "string" && clave.startsWith("/checador/administrativeMinutes"));
  const guardar = async () => {
    const r = await f.guardar();
    if (r.ok) { refrescarLista(); return r; }
    if (r.errores) {
      const p = primerPasoConError(r.errores);
      if (p) { irAPaso(p); enfocar(primerCampoConError(r.errores, p)); }
    }
    return r;
  };
  // «Guardar y salir» del aviso de salida.
  const confirmarSalida = useGuardiaSalida({ hayCambios: f.sucio, guardar: async () => (await guardar()).ok });
  // Mientras hay cambios, la guardia deja una entrada extra en el historial: se REEMPLAZA (igual que el contrato).
  const irTrasGuardar = () => (window.history.state?.__cambiosPendientes ? router.replace(volverA) : router.push(volverA));
  const alGuardar = async () => {
    if (f.isSubmitting) return;
    if ((await guardar()).ok) irTrasGuardar();
  };
  const cancelar = () => confirmarSalida(({ reemplazar }) => (reemplazar ? router.replace(volverA) : router.push(volverA)), { navega: true });
  // «Continuar» (alta): revisa solo los datos de este paso; si están bien, pasa al siguiente. No guarda todavía.
  const continuar = async () => {
    if (!(await f.revisarPaso(paso))) {
      enfocar(primerCampoConError(form.formState.errors, paso));
      return;
    }
    irAPaso(siguiente);
  };

  const error = (campo) => errors[campo]?.message ?? null;
  const cuantos = erroresPorPaso(errors);
  const valores = form.watch();

  // ——— Paso 1: persona y tipo de acta ———
  const empresas = (dataUser?.empresas_detalle || []).map((e) => ({ value: String(e.id_empresa), label: e.nombre }));
  const sugerencias = f.sugerenciasEmpleados;
  const teclaBuscador = (e) => {
    if (!f.isEmpSuggestionsOpen || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      f.setHoveredEmpSuggestionIndex((prev) => (prev + 1 >= sugerencias.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      f.setHoveredEmpSuggestionIndex((prev) => (prev - 1 < 0 ? sugerencias.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      f.handleSelectEmpleadoSugerencia(sugerencias[f.hoveredEmpSuggestionIndex] || sugerencias[0]);
    } else if (e.key === "Escape") {
      f.setIsEmpSuggestionsOpen(false);
    }
  };
  const tiposOpciones = (f.tiposActa || []).map((t) => ({ value: String(t.id_tipo_acta), label: `${t.nombre_tipo} (ID ${t.id_tipo_acta})` }));
  const Persona = (
    <SeccionFormulario titulo="Persona y tipo de acta" columnas={1}>
      {!editar ? (
        <CampoFormulario id={ID.empresa} etiqueta="Empresa" obligatorio error={error("empresa")}>
          {(p) => <Lista {...p} opciones={empresas} valor={valores.empresa} onCambio={f.cambiarEmpresa} vacio="Selecciona una empresa" />}
        </CampoFormulario>
      ) : null}
      <Controller control={form.control} name="empleado" render={({ field }) => (
        <CampoFormulario id={ID.empleado} etiqueta="Empleado" obligatorio error={error("empleado")}
          ayuda={!f.empresaSeleccionada ? "Primero elige la empresa." : "Escribe parte del nombre y elige de la lista."}>
          {(p) => (
            // Buscador tipo Contratos: el valor real es field.value (id_empleado); lo que se ve es el nombre.
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-texto-secundario" aria-hidden="true" />
              <input {...p} className={cn(p.className, "pl-12")} type="text" autoComplete="off" role="combobox"
                aria-expanded={f.isEmpSuggestionsOpen && sugerencias.length > 0} aria-controls="acta-empleado-sugerencias" aria-autocomplete="list"
                placeholder="Buscar empleado…" value={f.empSearch} disabled={!f.empresaSeleccionada}
                onChange={(e) => {
                  f.setEmpSearch(e.target.value);
                  f.setIsEmpSuggestionsOpen(true);
                  f.setHoveredEmpSuggestionIndex(0);
                  // Si el usuario empieza a escribir manual, limpiamos el id para forzar selección válida.
                  field.onChange("");
                }}
                onFocus={() => f.setIsEmpSuggestionsOpen(!!f.empSearch)}
                onBlur={() => setTimeout(() => f.setIsEmpSuggestionsOpen(false), 120)}
                onKeyDown={teclaBuscador} />
              {f.isEmpSuggestionsOpen && sugerencias.length > 0 ? (
                <ul id="acta-empleado-sugerencias" role="listbox" aria-label="Empleados"
                  className="absolute left-0 right-0 z-20 mt-1 max-h-72 list-none overflow-auto rounded-boton border border-borde-campo bg-white p-1 shadow-lg">
                  {sugerencias.map((emp, idx) => (
                    <li key={emp.id_empleado} role="option" aria-selected={idx === f.hoveredEmpSuggestionIndex}
                      onMouseDown={() => f.handleSelectEmpleadoSugerencia(emp)} onMouseEnter={() => f.setHoveredEmpSuggestionIndex(idx)}
                      className={cn("flex min-h-12 cursor-pointer items-center rounded-lg px-3 text-cuerpo text-texto",
                        idx === f.hoveredEmpSuggestionIndex && "bg-seleccion font-semibold text-seleccion-texto")}>
                      {emp.nombre_completo}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </CampoFormulario>
      )} />
      <CampoFormulario id={ID.tipoActa} etiqueta="Tipo de acta" obligatorio error={error("tipoActa")}
        ayuda={!f.empresaSeleccionada ? "Primero elige la empresa." : "¿No está? Créalo con el botón +."}>
        {(p) => (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Lista {...p} opciones={tiposOpciones} valor={valores.tipoActa}
                onCambio={(v) => form.setValue("tipoActa", v, { shouldDirty: true, shouldTouch: true })}
                disabled={!f.empresaSeleccionada || f.loadingTipos}
                vacio={!f.empresaSeleccionada ? "Selecciona primero una empresa" : f.loadingTipos ? "Cargando tipos…" : "Elige el tipo"} />
            </div>
            <Button type="button" variant="outline" size="icon" className="size-campo shrink-0" onClick={() => setOpenNewTipoActa(true)}
              title="Crear tipo de acta" aria-label="Crear tipo de acta" disabled={!f.empresaSeleccionada}>
              <PlusIcon aria-hidden="true" />
            </Button>
          </div>
        )}
      </CampoFormulario>
    </SeccionFormulario>
  );

  // ——— Paso 2: qué pasó ———
  const Hecho = (
    <SeccionFormulario titulo="Qué pasó" descripcion="Cuándo y dónde fue, lo que pasó y quién lo vio.">
      <CampoFormulario id={ID.fechaIncidente} etiqueta="Fecha del incidente" obligatorio error={error("fechaIncidente")}>
        {(p) => <input {...p} type="date" {...form.register("fechaIncidente")} />}
      </CampoFormulario>
      <CampoFormulario id={ID.horaIncidente} etiqueta="Hora del incidente">
        {(p) => <input {...p} type="time" {...form.register("horaIncidente")} />}
      </CampoFormulario>
      <CampoFormulario id={ID.lugar} etiqueta="Lugar del incidente" className="md:col-span-2">
        {(p) => <input {...p} type="text" placeholder="Ej.: Oficina, Almacén" {...form.register("lugar")} />}
      </CampoFormulario>
      <CampoFormulario id={ID.descripcion} etiqueta="Descripción de los hechos" obligatorio error={error("descripcion")} className="md:col-span-2">
        {(p) => <textarea {...p} className={cn(p.className, CLASE_TEXTO_LARGO)} rows={5} placeholder="Describe detalladamente lo sucedido…" {...form.register("descripcion")} />}
      </CampoFormulario>
      <CampoFormulario id={ID.testigos} etiqueta="Testigos" ayuda="Opcional. Nombres de los testigos presentes." className="md:col-span-2">
        {(p) => <textarea {...p} className={cn(p.className, CLASE_TEXTO_LARGO)} rows={3} {...form.register("testigos")} />}
      </CampoFormulario>
    </SeccionFormulario>
  );

  // ——— Paso 3: sanción y quién la elabora ———
  const autoElabora = !editar && f.autoElaboraDisponible;
  const Sancion = (
    <SeccionFormulario titulo="Sanción y quién la elabora">
      <CampoFormulario id={ID.sancion} etiqueta="Tipo de sanción" obligatorio error={error("sancion")} className="md:col-span-2">
        {(p) => <Lista {...p} opciones={SANCIONES.map((s) => ({ value: s, label: formatearTexto(s) }))} valor={valores.sancion}
          onCambio={(v) => form.setValue("sancion", v, { shouldDirty: true, shouldTouch: true })} vacio="Selecciona una sanción" />}
      </CampoFormulario>
      <CampoFormulario id={ID.elabora} etiqueta="Elabora el acta" obligatorio error={error("elabora")}
        ayuda={autoElabora ? "Eres tú: se toma de tu sesión." : null}>
        {(p) => (!editar && f.elaboraAutoEnProceso
          ? <input {...p} value="Cargando usuario logeado…" disabled readOnly />
          : autoElabora
            // Autollenado SOLO al crear: si se resolvió el empleado de la sesión, se bloquea y se muestra el nombre.
            ? <input {...p} value={f.empleadoElaboraAutoNombre || "—"} disabled readOnly />
            : <Lista {...p} opciones={f.empleadosElabora} valor={valores.elabora}
              onCambio={(v) => form.setValue("elabora", v, { shouldDirty: true, shouldTouch: true })}
              vacio={!f.empresaSeleccionada ? "Selecciona primero una empresa" : "Selecciona quién elabora"} disabled={!f.empresaSeleccionada} />)}
      </CampoFormulario>
      <CampoFormulario id={ID.cargoElabora} etiqueta="Cargo de quien elabora" ayuda={autoElabora ? "Su puesto, de su ficha." : null}>
        {/* Si elabora viene de sesión, este campo se autollena y es solo lectura. */}
        {(p) => <input {...p} type="text" placeholder="Ej.: Jefe de RH" disabled={autoElabora} {...form.register("cargoElabora")} />}
      </CampoFormulario>
    </SeccionFormulario>
  );

  // ——— Paso 4: declaraciones ———
  const Interruptor = ({ name, etiqueta, ayuda }) => (
    <Controller control={form.control} name={name} render={({ field }) => (
      <div className="flex items-start gap-4 rounded-boton border border-borde-campo px-4 py-3 md:col-span-2">
        <Switch id={ID[name]} checked={field.value} onCheckedChange={field.onChange} aria-describedby={`${ID[name]}-ayuda`}
          className="mt-0.5 h-7 w-12 shrink-0 data-[state=checked]:bg-brand data-[state=unchecked]:bg-texto-deshabilitado [&>span]:size-6" />
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ID[name]} className="cursor-pointer text-etiqueta font-semibold text-texto">{etiqueta}</label>
          <p id={`${ID[name]}-ayuda`} data-chico className="m-0 text-ayuda text-texto-secundario">{ayuda}</p>
        </div>
      </div>
    )} />
  );
  const Declaraciones = (
    <SeccionFormulario titulo="Declaraciones" descripcion="Lo que dice la persona sobre los hechos.">
      <CampoFormulario id={ID.descargo} etiqueta="Descargo del trabajador" ayuda="Opcional. La versión del empleado." className="md:col-span-2">
        {(p) => <textarea {...p} className={cn(p.className, CLASE_TEXTO_LARGO)} rows={4} {...form.register("descargo")} />}
      </CampoFormulario>
      {Interruptor({ name: "aceptaHechos", etiqueta: "El trabajador acepta los hechos", ayuda: "Marca si el empleado reconoce los hechos descritos." })}
      {Interruptor({ name: "esReincidencia", etiqueta: "Es reincidencia", ayuda: "Marca si el empleado ya tiene actas previas similares." })}
    </SeccionFormulario>
  );

  // ——— Paso 5: revisar ———
  const nombreTipo = (f.tiposActa || []).find((t) => String(t.id_tipo_acta) === String(valores.tipoActa))?.nombre_tipo ?? "";
  const nombreElabora = autoElabora
    ? f.empleadoElaboraAutoNombre
    : f.empleadosElabora.find((o) => o.value === valores.elabora)?.label ?? (editar ? actaToEdit?.nombre_quien_elabora : "") ?? "";
  const empresaNombre = editar ? actaToEdit?.nombre_empresa : empresas.find((e) => e.value === valores.empresa)?.label;
  const renglon = (etiqueta, valor) => (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-borde py-3 last:border-b-0 md:flex-row md:gap-6">
      <dt className="shrink-0 font-semibold text-texto md:w-60">{etiqueta}</dt>
      <dd className="m-0 min-w-0 whitespace-pre-line break-words text-texto">{valor || <span className="text-texto-secundario">Sin dato</span>}</dd>
    </div>
  );
  const bloque = (titulo, clave, filas) => (
    <SeccionFormulario titulo={titulo} columnas={1}
      accion={<Button type="button" variant="outline" onClick={() => irAPaso(clave)}>Cambiar</Button>}>
      <dl className="m-0">{filas}</dl>
    </SeccionFormulario>
  );
  const Revisar = (
    <div className="flex flex-col gap-4 lg:gap-6" data-resumen-acta>
      {bloque("Persona y tipo de acta", "persona", <>
        {renglon("Empresa", empresaNombre)}
        {renglon("Empleado", valores.empleado ? f.empSearch : "")}
        {renglon("Tipo de acta", nombreTipo)}
      </>)}
      {bloque("Qué pasó", "hecho", <>
        {renglon("Fecha y hora", [valores.fechaIncidente, valores.horaIncidente].filter(Boolean).join(" · "))}
        {renglon("Lugar", valores.lugar)}
        {renglon("Descripción de los hechos", valores.descripcion)}
        {renglon("Testigos", valores.testigos)}
      </>)}
      {bloque("Sanción y quién la elabora", "sancion", <>
        {renglon("Tipo de sanción", formatearTexto(valores.sancion))}
        {renglon("Elabora el acta", nombreElabora)}
        {renglon("Cargo de quien elabora", valores.cargoElabora)}
      </>)}
      {bloque("Declaraciones", "declaraciones", <>
        {renglon("Descargo del trabajador", valores.descargo)}
        {renglon("Acepta los hechos", siNo(valores.aceptaHechos))}
        {renglon("Es reincidencia", siNo(valores.esReincidencia))}
      </>)}
    </div>
  );

  const contenido = { persona: Persona, hecho: Hecho, sancion: Sancion, declaraciones: Declaraciones, revisar: Revisar };
  const ultimo = !siguiente;
  const totalErrores = Object.values(cuantos).reduce((a, b) => a + b, 0);

  const encabezado = (
    <EncabezadoPagina
      completo
      volver={{ href: volverA, texto: volverA === RUTA_ACTAS ? "Actas administrativas" : "Volver" }}
      titulo={editar ? "Editar acta administrativa" : "Nueva acta administrativa"}
      descripcion={editar
        ? [actaToEdit?.folio, f.empSearch].filter(Boolean).join(" · ") || "Cambia lo que haga falta y guarda."
        : "Llena cada paso; al final revisas todo antes de guardar. Lo que falte se marca en rojo."}
    />
  );
  const barra = (
    <BarraAccionesFormulario
      cancelar={{ onClick: cancelar, deshabilitado: f.isSubmitting }}
      atras={anterior ? { onClick: () => irAPaso(anterior) } : null}
      siguiente={editar && siguiente ? { onClick: () => irAPaso(siguiente) } : null}
      principal={editar
        ? { texto: "Guardar cambios", onClick: alGuardar, cargando: f.isSubmitting }
        : ultimo
          ? { texto: "Guardar acta", onClick: alGuardar, cargando: f.isSubmitting }
          : { texto: "Continuar", clave: "continuar", onClick: continuar }}
      aviso={f.sucio ? <span data-sin-guardar className="font-medium text-estado-aviso-texto">Tienes cambios sin guardar.</span> : null}
    />
  );

  return (
    <PaginaFormulario data-vista="formulario-acta" data-modo={editar ? "editar" : "nuevo"} encabezado={encabezado} barra={barra}>
      <div data-formulario-grande className="contents">
        {totalErrores ? (
          <div role="alert" data-errores-acta className="flex flex-col gap-3 rounded-seccion border border-peligro-borde bg-estado-error px-4 py-3.5 text-estado-error-texto">
            <p className="m-0 font-bold">Faltan o hay que corregir {totalErrores === 1 ? "un dato" : `${totalErrores} datos`}:</p>
            <div className="flex flex-wrap gap-2">
              {PASOS_ACTA.filter((p) => cuantos[p.clave]).map((p) => (
                <Button key={p.clave} type="button" variant="destructive-outline" onClick={() => irAPaso(p.clave)}>
                  {p.texto} ({cuantos[p.clave]})
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <PasosGuiados pasos={PASOS_ACTA} actual={paso} visitados={visitados} errores={cuantos} todosListos={editar} alElegir={irAPaso}>
          {contenido[paso]}
        </PasosGuiados>
      </div>

      <NewTipoActaModal
        open={openNewTipoActa}
        onClose={setOpenNewTipoActa}
        refetch={f.mutateTiposActa}
        idEmpresa={f.empresaSeleccionada}
        mutateTiposActa={f.mutateTiposActa}
      />
    </PaginaFormulario>
  );
}
