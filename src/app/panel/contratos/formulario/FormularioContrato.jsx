"use client";

// Editar o crear un contrato EN PÁGINA, no en ventana (27/11/2026, pedido del dueño: «hay que evitar en lo que podamos
// ventanas flotantes, o si sí se hacen que estén bonitas, por tabs»). Mismo estilo que la vista de detalle
// (docs/vistas-de-detalle.md): encabezado blanco con filo azul, pestañas Persona y puesto · Sueldo · Jornada ·
// Prestaciones · Documento, y Guardar / Cancelar siempre visibles (barra fija abajo en celular). Si sales con cambios
// sin guardar, se pregunta (useGuardiaSalida: enlaces, botón atrás, recargar o cerrar la pestaña).
//   - Editar (/panel/contratos/[id]/editar): solo se manda lo que cambiaste (INC-CONTRATO-EDITAR-001). El sueldo se ve
//     aquí, pero se cambia con «Cambiar sueldo (convenio)» para que quede su historial. Un contrato mandado a firmar,
//     firmado o terminado se ve sin poder editarse y se explica por qué.
//   - Nuevo (/panel/contratos/nuevo): también duplicar (?duplicar=<id>) y desde la ficha (?empleado=&empresa=&sueldo=&periodicidad=).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { useSnackbar } from "notistack";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import { EncabezadoDetalle, BarraAccionesMovil, EspacioBarraMovil, BotonAccion, TarjetaDetalle } from "@/components/detalle";
import {
  TIPOS, estadoContrato, vigenciaTexto, firmaResumen, iniciales, sueldoTarjeta, dinero, porPeriodo, mensajeDeError,
} from "@/lib/contratos/detalleContrato.mjs";
import { PESTANAS, TIPOS_OPCIONES, PERIODICIDADES, JORNADAS, MODALIDADES, MONEDAS, pideFechaFin, pestanaDe } from "@/lib/contratos/formularioContrato.mjs";
import { ConvenioDialog } from "../[id]/DialogosContrato";
import useFormularioContrato from "./useFormularioContrato";
import { Campo, Lista, Dato, Nota } from "./campos";

const PERIODOS = PERIODICIDADES.map((p) => ({ value: p, label: p }));

export default function FormularioContrato({ modo, id = null, duplicar = null, inicial = null }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth() ?? {};
  const empresas = dataUser?.empresas_detalle ?? [];
  const editar = modo === "editar";
  const f = useFormularioContrato({ modo, id, duplicar, inicial, empresas, elaboradoPor: dataUser?.id_empleado ?? null });
  const [pestana, setPestana] = useState("persona");
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [convenio, setConvenio] = useState(false);

  const volverA = editar ? `/panel/contratos/${id}` : duplicar ? `/panel/contratos/${duplicar}` : "/panel/contratos";
  const irA = (ruta) => ({ reemplazar }) => (reemplazar ? router.replace(ruta) : router.push(ruta));

  const guardar = async () => {
    setGuardando(true);
    setErrorServidor("");
    const r = await f.guardar();
    setGuardando(false);
    if (r.ok) return r;
    if (r.pestana) {
      setPestana(r.pestana);
      // Lleva a la persona al primer campo con error (ya en su pestaña).
      setTimeout(() => document.getElementById(`ct-${r.campo}`)?.focus(), 60);
      enqueueSnackbar("Revisa los datos marcados en rojo.", { variant: "warning" });
    } else {
      const mensaje = mensajeDeError(r.error, "No se pudo guardar el contrato.");
      setErrorServidor(mensaje);
      enqueueSnackbar(mensaje, { variant: "error" });
    }
    return r;
  };
  // «Guardar y salir» del aviso de salida.
  const confirmarSalida = useGuardiaSalida({ hayCambios: f.sucio, guardar: async () => (await guardar()).ok });

  // Guardado: al contrato. Mientras hay cambios, la guardia de salida deja una entrada extra en el historial
  // («__cambiosPendientes», CambiosPendientes.jsx); se REEMPLAZA en lugar de agregar otra encima (si se marcara «sin
  // cambios» antes de navegar, la guardia haría back() a la vez que este push y los dos recorridos se pisan en Next).
  const irTrasGuardar = (ruta) => (window.history.state?.__cambiosPendientes ? router.replace(ruta) : router.push(ruta));
  const alGuardar = async () => {
    if (guardando) return;
    const r = await guardar();
    if (!r.ok) return;
    if (editar) {
      enqueueSnackbar(r.sinCambios ? "No cambiaste ningún dato." : "Contrato actualizado.", { variant: r.sinCambios ? "info" : "success" });
      irTrasGuardar(`/panel/contratos/${id}`);
      return;
    }
    enqueueSnackbar(`Contrato ${r.folio ?? ""} creado.${r.cerrados?.length ? ` Se cerró ${r.cerrados.join(", ")} (solo puede haber uno vigente).` : ""}`, { variant: "success" });
    irTrasGuardar(r.id ? `/panel/contratos/${r.id}` : "/panel/contratos");
  };
  const cancelar = () => confirmarSalida(irA(volverA), { navega: true });

  if (f.cargando) {
    return <div className="flex items-center justify-center gap-2 py-24 text-[17px] text-[#374151]"><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Cargando contrato…</div>;
  }
  if (f.error) {
    const estado = f.error?.response?.status;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-16 text-[17px] text-[#111827]">
        <h1 className="m-0 text-[24px] font-bold">{estado === 404 ? "No encontramos este contrato" : estado === 403 ? "No tienes acceso a este contrato" : "No se pudo abrir el contrato"}</h1>
        <p className="m-0 text-[#374151]">{mensajeDeError(f.error, "Intenta de nuevo en un momento.")}</p>
        <Link href="/panel/contratos" className="inline-flex min-h-12 items-center font-semibold text-[#1E40C4]">‹ Volver a Contratos</Link>
      </div>
    );
  }

  const { form, errores, contrato, permiso } = f;
  const soloLectura = !permiso.editable;
  const errorDe = (campo) => errores.find((e) => e.campo === campo)?.mensaje ?? null;
  const cuantos = (clave) => errores.filter((e) => pestanaDe(e.campo) === clave).length;
  const valor = (campo) => form[campo] ?? "";
  const alCambiar = (campo) => (e) => f.cambiar(campo, typeof e === "string" ? e : e.target.value);
  const nombre = editar ? contrato?.nombre_empleado : f.persona?.nombre;
  const empresaNombre = empresas.find((e) => String(e.id_empresa) === String(form.id_empresa))?.nombre ?? contrato?.empresa ?? "";
  const personas = f.empleados.map((e) => ({ value: e.id, label: e.nombre }));
  const jefes = f.empleados.filter((e) => e.id !== form.id_empleado).map((e) => ({ value: e.id, label: e.nombre }));
  // El jefe guardado puede ya no estar activo: se muestra con su nombre igual.
  if (form.jefe_inmediato_id && !jefes.some((j) => j.value === form.jefe_inmediato_id) && contrato?.nombre_jefe) jefes.unshift({ value: form.jefe_inmediato_id, label: contrato.nombre_jefe });
  const servicios = form.tipo_contrato === "prestacion_servicios";

  const etiqueta = editar
    ? `Editar contrato ${contrato?.folio ?? ""} · ${TIPOS[form.tipo_contrato] ?? contrato?.tipo_contrato ?? ""}`
    : duplicar ? `Duplicar contrato ${contrato?.folio ?? ""}` : "Contrato nuevo";
  const filas = editar && contrato ? [
    { etiqueta: "Vigencia", valor: vigenciaTexto(contrato) },
    { etiqueta: "Firma", valor: firmaResumen(f.datos?.firma).texto, tono: firmaResumen(f.datos?.firma).tono === "exito" ? "exito" : "aviso" },
  ] : [];

  const acciones = soloLectura
    ? { primaria: { clave: "volver", texto: "Volver al contrato", tipo: "primaria", href: volverA } }
    : {
      primaria: { clave: "guardar", texto: editar ? "Guardar cambios" : "Guardar contrato", tipo: "primaria", onClick: alGuardar, cargando: guardando },
      secundaria: { clave: "cancelar", texto: "Cancelar", tipo: "normal", onClick: cancelar, deshabilitada: guardando },
    };

  // ——— Pestañas ———
  const Persona = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {editar ? (
        <div className="flex flex-col gap-2 md:col-span-2">
          <Dato etiqueta="Persona">{contrato?.nombre_empleado} · <Link href={`/panel/empleados?id=${contrato?.id_empleado}`} className="font-semibold text-[#1E40C4] underline">Ver ficha</Link></Dato>
          <p className="m-0 text-[#4B5563]">La persona no se cambia en un contrato. Para otra persona, crea un contrato nuevo.</p>
        </div>
      ) : (
        <>
          {empresas.length > 1 ? (
            <Campo id="ct-id_empresa" etiqueta="Empresa" error={errorDe("id_empresa")}>
              {(p) => <Lista {...p} opciones={empresas.map((e) => ({ value: String(e.id_empresa), label: e.nombre }))} valor={valor("id_empresa")} onCambio={alCambiar("id_empresa")} vacio="Elige la empresa" />}
            </Campo>
          ) : <Dato etiqueta="Empresa">{empresaNombre || "—"}</Dato>}
          <Campo id="ct-id_empleado" etiqueta="Persona" error={errorDe("id_empleado")} ayuda={f.cargandoPersonas ? "Cargando personas…" : !form.id_empresa ? "Primero elige la empresa." : null}>
            {(p) => <Lista {...p} disabled={!form.id_empresa} opciones={personas} valor={valor("id_empleado")} onCambio={alCambiar("id_empleado")} vacio="Elige a la persona" />}
          </Campo>
        </>
      )}
      <Campo id="ct-puesto" etiqueta="Puesto" error={errorDe("puesto")}>
        {(p) => <><input {...p} list="ct-puestos" value={valor("puesto")} onChange={alCambiar("puesto")} disabled={soloLectura} placeholder="Ej.: Cajera" />
          <datalist id="ct-puestos">{f.puestos.map((x) => <option key={x} value={x} />)}</datalist></>}
      </Campo>
      <Campo id="ct-departamento" etiqueta="Departamento o área">
        {(p) => <input {...p} value={valor("departamento")} onChange={alCambiar("departamento")} disabled={soloLectura} placeholder="Ej.: Ventas" />}
      </Campo>
      <Campo id="ct-jefe_inmediato_id" etiqueta="Jefe inmediato">
        {(p) => <Lista {...p} opciones={jefes} valor={valor("jefe_inmediato_id")} onCambio={alCambiar("jefe_inmediato_id")} vacio="Sin jefe directo" disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-lugar_trabajo" etiqueta="Lugar de trabajo">
        {(p) => <input {...p} value={valor("lugar_trabajo")} onChange={alCambiar("lugar_trabajo")} disabled={soloLectura} placeholder="Ej.: Sucursal Centro" />}
      </Campo>
      <Campo id="ct-modalidad_trabajo" etiqueta="Modalidad">
        {(p) => <Lista {...p} opciones={MODALIDADES} valor={valor("modalidad_trabajo")} onCambio={alCambiar("modalidad_trabajo")} disabled={soloLectura} />}
      </Campo>
      {!editar ? <Dato etiqueta="Lo elabora">{[dataUser?.nombre, dataUser?.apellido_paterno].filter(Boolean).join(" ") || "—"}</Dato> : null}
    </div>
  );

  const tarjeta = editar ? sueldoTarjeta(f.datos?.sueldo) : null;
  const vigente = String(contrato?.estatus ?? "").toLowerCase() === "activo";
  const Sueldo = editar ? (
    <div className="flex flex-col gap-3" data-sueldo-solo-lectura>
      {tarjeta ? (
        <div>
          <p className="m-0 text-[26px] font-bold leading-tight lg:text-[30px]" data-sueldo>{tarjeta.principal} <span className="text-[17px] font-medium text-[#374151] lg:text-[16px]">{tarjeta.sufijo}</span></p>
          <p className="m-0 text-[#374151]">{tarjeta.detalle}</p>
        </div>
      ) : <p className="m-0 text-[#374151]">Sin sueldo registrado.</p>}
      <Nota>El sueldo no se cambia aquí: se cambia con un convenio, para que quede en el historial (antes, después, desde cuándo y quién). La nómina, los finiquitos y los aguinaldos usan el sueldo nuevo.</Nota>
      {vigente ? (
        <BotonAccion accion={{ clave: "convenio", texto: "Cambiar sueldo (convenio)", tipo: "contorno", onClick: () => setConvenio(true) }} className="self-start" />
      ) : <p className="m-0 text-[#374151]">Este contrato no está vigente: para otro sueldo, renueva el contrato o crea uno nuevo.</p>}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {form.periodicidadOrigen ? (
        <Nota tono="aviso" data-aviso-periodicidad className="md:col-span-3">
          El contrato que estás duplicando guarda la periodicidad «{form.periodicidadOrigen}» y los cálculos de la nómina la leen como mensual
          ({dinero(form.salario_base, { centavos: "siempre" })} al mes). Elige cada cuándo se le paga y revisa el sueldo antes de guardar.
        </Nota>
      ) : null}
      <Campo id="ct-periodicidad_pago" etiqueta="¿Cada cuándo se le paga?" error={errorDe("periodicidad_pago")}>
        {(p) => <Lista {...p} opciones={PERIODOS} valor={valor("periodicidad_pago")} onCambio={alCambiar("periodicidad_pago")} vacio="Elige una opción" />}
      </Campo>
      <Campo id="ct-salario_base" etiqueta={`Sueldo ${porPeriodo(form.periodicidad_pago) || "por periodo"}`} error={errorDe("salario_base")}
        ayuda="Lo que gana en cada periodo de pago, antes de impuestos.">
        {(p) => <input {...p} type="number" inputMode="decimal" min="0" step="0.01" value={valor("salario_base")} onChange={alCambiar("salario_base")} />}
      </Campo>
      <Campo id="ct-moneda" etiqueta="Moneda" error={errorDe("moneda")}>
        {(p) => <Lista {...p} opciones={MONEDAS} valor={valor("moneda")} onCambio={alCambiar("moneda")} />}
      </Campo>
    </div>
  );

  const Jornada = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Campo id="ct-tipo_jornada" etiqueta="Tipo de jornada">
        {(p) => <Lista {...p} opciones={JORNADAS} valor={valor("tipo_jornada")} onCambio={alCambiar("tipo_jornada")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-horas_semanales" etiqueta="Horas a la semana" error={errorDe("horas_semanales")} ayuda="La jornada diurna es de máximo 48 horas a la semana.">
        {(p) => <input {...p} type="number" inputMode="decimal" min="1" max="168" step="0.5" value={valor("horas_semanales")} onChange={alCambiar("horas_semanales")} disabled={soloLectura} />}
      </Campo>
      {!form.horario_reconocido ? (
        <Nota tono="aviso" className="md:col-span-2" data-horario-guardado>
          Horario guardado: «{form.horario_original}». Se queda tal cual; si escribes la entrada y la salida, se reemplaza por las horas que pongas.
        </Nota>
      ) : null}
      <Campo id="ct-hora_entrada" etiqueta="Entrada" error={errorDe("hora_entrada")}>
        {(p) => <input {...p} type="time" value={valor("hora_entrada")} onChange={alCambiar("hora_entrada")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-hora_salida" etiqueta="Salida">
        {(p) => <input {...p} type="time" value={valor("hora_salida")} onChange={alCambiar("hora_salida")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-hora_comida_inicio" etiqueta="Comida: empieza" error={errorDe("hora_comida_inicio")} ayuda="Déjalo vacío si no tiene horario de comida.">
        {(p) => <input {...p} type="time" value={valor("hora_comida_inicio")} onChange={alCambiar("hora_comida_inicio")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-hora_comida_fin" etiqueta="Comida: termina">
        {(p) => <input {...p} type="time" value={valor("hora_comida_fin")} onChange={alCambiar("hora_comida_fin")} disabled={soloLectura} />}
      </Campo>
    </div>
  );

  const Prestaciones = servicios ? (
    <Nota>La prestación de servicios no es una relación laboral: no lleva vacaciones, prima vacacional ni aguinaldo de ley.</Nota>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Campo id="ct-dias_vacaciones" etiqueta="Días de vacaciones" error={errorDe("dias_vacaciones")}
        ayuda={f.vacacionesLey ? `La ley pide ${f.vacacionesLey.dias} días en el año ${f.vacacionesLey.anio} de servicio (art. 76). Puedes dar más, no menos.` : "La ley pide 12 días el primer año, 14 el segundo, 16 el tercero… (art. 76)."}>
        {(p) => <input {...p} type="number" inputMode="numeric" min="0" value={valor("dias_vacaciones")} onChange={alCambiar("dias_vacaciones")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-aguinaldo_dias" etiqueta="Días de aguinaldo" error={errorDe("aguinaldo_dias")} ayuda="Al menos 15 días (art. 87).">
        {(p) => <input {...p} type="number" inputMode="numeric" min="15" value={valor("aguinaldo_dias")} onChange={alCambiar("aguinaldo_dias")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-prima_vacacional" etiqueta="Prima vacacional (%)" error={errorDe("prima_vacacional")} ayuda="Al menos 25 % (art. 80).">
        {(p) => <input {...p} type="number" inputMode="decimal" min="25" step="0.01" value={valor("prima_vacacional")} onChange={alCambiar("prima_vacacional")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-prestaciones_superiores" etiqueta="Otras prestaciones" className="md:col-span-3" ayuda="Sepáralas con comas. Ej.: Vales de despensa, Seguro de gastos médicos.">
        {(p) => <textarea {...p} className={`${p.className} min-h-24 py-2`} value={valor("prestaciones_superiores")} onChange={alCambiar("prestaciones_superiores")} disabled={soloLectura} />}
      </Campo>
    </div>
  );

  const Documento = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Campo id="ct-tipo_contrato" etiqueta="Tipo de contrato" error={errorDe("tipo_contrato")} ayuda="Con el tipo se elige la plantilla del documento.">
        {(p) => <Lista {...p} opciones={TIPOS_OPCIONES} valor={valor("tipo_contrato")} onCambio={alCambiar("tipo_contrato")} vacio={form.tipo_contrato ? null : "Elige el tipo"} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-fecha_inicio" etiqueta="Inicia el" error={errorDe("fecha_inicio")}>
        {(p) => <input {...p} type="date" value={valor("fecha_inicio")} onChange={alCambiar("fecha_inicio")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-fecha_fin" etiqueta={pideFechaFin(form.tipo_contrato) ? "Termina el" : "Termina el (no aplica a este tipo)"} error={errorDe("fecha_fin")}>
        {(p) => <input {...p} type="date" min={form.fecha_inicio || undefined} value={valor("fecha_fin")} onChange={alCambiar("fecha_fin")} disabled={soloLectura || (!pideFechaFin(form.tipo_contrato) && !form.fecha_fin)} />}
      </Campo>
      <Campo id="ct-notas" etiqueta="Causa u obra, y notas" className="md:col-span-3"
        ayuda="En un contrato por tiempo u obra determinado escribe aquí la causa o la obra: es lo que dice el texto del contrato.">
        {(p) => <textarea {...p} className={`${p.className} min-h-28 py-2`} value={valor("notas")} onChange={alCambiar("notas")} disabled={soloLectura} />}
      </Campo>
      <Nota className="md:col-span-3">
        {editar
          ? <>La plantilla, la vista del documento y las firmas están en el contrato. Mientras no se mande a firmar, el texto se actualiza con estos datos.</>
          : <>Al guardar, el contrato toma la plantilla de su tipo (la de tu empresa o la base de ADAMIA). Después lo revisas y lo mandas a firmar desde el contrato.</>}
      </Nota>
    </div>
  );

  const contenido = { persona: Persona, sueldo: Sueldo, jornada: Jornada, prestaciones: Prestaciones, documento: Documento };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 text-[17px] text-[#111827] lg:gap-[18px] lg:text-[16px]" data-vista="formulario-contrato" data-modo={modo}>
      <EncabezadoDetalle
        volver={{ href: volverA, texto: editar || duplicar ? `Contrato ${contrato?.folio ?? ""}` : "Contratos" }}
        iniciales={nombre ? iniciales(nombre) : "+"}
        etiqueta={etiqueta}
        titulo={nombre || (editar ? "Contrato" : "Contrato nuevo")}
        subtitulo={<p className="m-0">{editar ? "Cambia los datos que necesites y guarda." : "Llena las pestañas y guarda. Lo que falte se marca en rojo."}</p>}
        estado={editar && contrato ? estadoContrato(contrato.estatus) : null}
        filas={filas}
      />

      {soloLectura ? <Nota tono="aviso" role="status" data-no-editable>{permiso.motivo}</Nota> : null}
      {errorServidor ? <Nota tono="error" role="alert" data-error-servidor>{errorServidor}</Nota> : null}
      {errores.length ? (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[#991B1B]" data-errores>
          <p className="m-0 font-bold">Faltan o hay que corregir {errores.length === 1 ? "un dato" : `${errores.length} datos`}:</p>
          <div className="flex flex-wrap gap-2">
            {PESTANAS.filter((p) => cuantos(p.clave)).map((p) => (
              <button key={p.clave} type="button" onClick={() => setPestana(p.clave)} className="min-h-12 rounded-[12px] border border-[#FCA5A5] bg-white px-4 font-semibold text-[#991B1B]">
                {p.texto} ({cuantos(p.clave)})
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Tabs.Root value={pestana} onValueChange={setPestana} className="flex flex-col gap-4">
        <Tabs.List aria-label="Secciones del contrato" className="flex flex-wrap gap-2" data-pestanas>
          {PESTANAS.map((p) => (
            <Tabs.Trigger key={p.clave} value={p.clave} data-pestana={p.clave}
              className="min-h-12 rounded-[14px] border border-[#CBD3E3] bg-white px-4 font-semibold text-[#374151] hover:bg-[#F3F5FA] data-[state=active]:border-[#2C56E8] data-[state=active]:bg-[#EEF2FF] data-[state=active]:text-[#1E40C4]">
              {p.texto}{cuantos(p.clave) ? <span className="ml-1.5 text-[#B91C1C]">({cuantos(p.clave)})</span> : null}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {PESTANAS.map((p) => (
          <Tabs.Content key={p.clave} value={p.clave} className="focus:outline-none">
            <TarjetaDetalle titulo={p.texto} data-panel={p.clave}>{contenido[p.clave]}</TarjetaDetalle>
          </Tabs.Content>
        ))}
      </Tabs.Root>

      {/* Escritorio: Guardar y Cancelar siempre a la vista, pegados abajo. */}
      <div className="sticky bottom-0 z-20 hidden items-center justify-end gap-3 border-t border-[#E5E7EB] bg-white px-2 py-3 lg:flex" role="toolbar" aria-label="Guardar o cancelar" data-barra-guardar>
        {f.sucio ? <span className="mr-auto text-[#9A3412]" data-sin-guardar>Tienes cambios sin guardar.</span> : null}
        {acciones.secundaria ? <BotonAccion accion={acciones.secundaria} /> : null}
        <BotonAccion accion={acciones.primaria} />
      </div>
      <EspacioBarraMovil />
      <BarraAccionesMovil primaria={acciones.primaria} secundaria={acciones.secundaria ?? null} />

      {editar && contrato ? (
        <ConvenioDialog abierto={convenio} alCerrar={() => setConvenio(false)} contrato={contrato}
          alGuardar={(mensaje) => { setConvenio(false); enqueueSnackbar(mensaje, { variant: "success" }); f.mutarDetalle(); }} />
      ) : null}
    </div>
  );
}
