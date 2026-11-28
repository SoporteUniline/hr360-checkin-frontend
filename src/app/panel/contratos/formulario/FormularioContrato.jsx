"use client";

// Editar o crear un contrato EN PÁGINA, no en ventana (27/11/2026, pedido del dueño: «hay que evitar en lo que podamos
// ventanas flotantes»), con el sistema de diseño (docs/sistema-diseno.md).
// (28/11/2026) TODO EN UNA SOLA HOJA hacia abajo (pedido del dueño: «sin pasos de siguiente, siguiente»): las cinco
// secciones una debajo de otra (Persona y puesto · Sueldo y pago · Jornada y horario · Prestaciones · Documento), cada
// una con su franja gris y la grilla que se acomoda al ancho; el ÍNDICE fijo a la izquierda (✓ o «Falta N», clic = baja
// suave a la sección, la que se ve queda resaltada; pastillas arriba con menos de 1200 px); el RESUMEN fijo a la derecha
// (abajo y plegable con menos); y la barra fija abajo con Cancelar a la izquierda y, a la derecha, el estado y Guardar.
// Los campos van «en línea» (solo una línea abajo, pedido del dueño) y lo que viene de un catálogo (persona, jefe,
// puesto, departamento, lugar de trabajo) es una lista CON BUSCADOR; puesto, departamento y lugar, con «+ Crear» en una
// ventana chica. El contrato sigue guardando el NOMBRE (texto) de puesto, departamento y lugar, como antes.
// Al guardar con datos faltantes se marcan en rojo TODOS, la pantalla baja a la primera sección con errores y arriba
// aparece el aviso con un enlace a cada sección; el foco se mueve con prepararFocoCampo (INC-012), nunca a ciegas.
// La lógica no cambió: mismas validaciones (validarFormulario), llamadas, aviso de salida (useGuardiaSalida) y
// parámetros (?duplicar, ?empleado, ?empresa, ?sueldo, ?periodicidad). Al editar solo se manda lo que cambió
// (INC-CONTRATO-EDITAR-001); el sueldo se ve, pero se cambia con «Cambiar sueldo (convenio)». Un contrato mandado a
// firmar, firmado o terminado se ve sin poder editarse y se explica por qué.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import { BotonAccion } from "@/components/detalle";
import { Button } from "@/components/ui/button";
import {
  BarraAccionesFormulario, EncabezadoPagina, EstiloCampos, EtiquetaEstado, IndiceSecciones, ListaConBuscador, PaginaFormulario, ResumenFormulario,
  SeccionFormulario, anclaSeccion, irASeccion, claseControl, CAMPO_ANCHO, CLASE_TEXTO_LARGO_LINEA, RENGLON_COMPLETO,
} from "@/components/formulario";
import { cn } from "@/lib/utils";
import { prepararFocoCampo } from "@/lib/formulario/focoCampo.mjs";
import { MAXIMO_SIN_BUSCADOR } from "@/lib/formulario/listaConBuscador.mjs";
import {
  TIPOS, estadoContrato, vigenciaTexto, firmaResumen, sueldoTarjeta, dinero, porPeriodo, mensajeDeError,
} from "@/lib/contratos/detalleContrato.mjs";
import { PESTANAS, TIPOS_OPCIONES, PERIODICIDADES, JORNADAS, MODALIDADES, MONEDAS, pideFechaFin, pestanaDe } from "@/lib/contratos/formularioContrato.mjs";
import { faltanPorPaso, faltanTextos, primerError, resumenContrato } from "@/lib/contratos/resumenContrato.mjs";
import { ConvenioDialog } from "../[id]/DialogosContrato";
import useFormularioContrato from "./useFormularioContrato";
import { useCatalogosContrato, puedeCrearEn } from "./catalogosContrato";
import VentanaAltaCatalogo from "./VentanaAltaCatalogo";
import { Campo, Lista, Dato, Nota } from "./campos";

const PERIODOS = PERIODICIDADES.map((p) => ({ value: p, label: p }));
const comoOpciones = (nombres) => nombres.map((n) => ({ value: n, label: n }));
const HORAS_ANCHO = "@[26rem]:col-span-2 @[42rem]:col-span-1";
// Secciones de 3 o 4 datos (máximo 3 columnas): que no quede un hueco cuando hay 2 columnas. El 3.º dato de 3 va a lo
// ancho solo con 2 columnas; el 4.º (un texto largo) se queda junto al 3.º con 2 columnas y va a lo ancho con 3.
const TERCERO_A_LO_ANCHO = "@[26rem]:col-span-2 @[42rem]:col-span-1";
const CUARTO_A_LO_ANCHO = "@[42rem]:col-span-full";
const datos = (n) => (n === 1 ? "1 dato" : `${n} datos`);

export default function FormularioContrato({ modo, id = null, duplicar = null, inicial = null }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser, permisosSesion } = useAuth() ?? {};
  const empresas = dataUser?.empresas_detalle ?? [];
  const editar = modo === "editar";
  const f = useFormularioContrato({ modo, id, duplicar, inicial, empresas, elaboradoPor: dataUser?.id_empleado ?? null });
  const catalogos = useCatalogosContrato(f.form?.id_empresa || "");
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [convenio, setConvenio] = useState(false);
  // Alta en un catálogo desde el contrato: { tipo, texto, idCampo } o null.
  const [alta, setAlta] = useState(null);

  const volverA = editar ? `/panel/contratos/${id}` : duplicar ? `/panel/contratos/${duplicar}` : "/panel/contratos";
  const irA = (ruta) => ({ reemplazar }) => (reemplazar ? router.replace(ruta) : router.push(ruta));

  const guardar = async () => {
    // El foco al primer dato con error se prepara AL INICIO (INC-012): si la persona ya se fue a otro campo mientras se
    // revisaba, no se le quita el foco ni se le mueve la pantalla.
    const enfocar = prepararFocoCampo();
    setGuardando(true);
    setErrorServidor("");
    const r = await f.guardar();
    setGuardando(false);
    if (r.ok) return r;
    if (r.pestana) {
      const primero = primerError(r.errores) ?? { campo: r.campo, seccion: r.pestana };
      enfocar(`ct-${primero.campo}`, { desplazar: () => irASeccion(primero.seccion) });
      enqueueSnackbar("Faltan datos: revisa lo marcado en rojo.", { variant: "warning" });
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
        <Link href="/panel/contratos" className="inline-flex min-h-12 items-center font-semibold text-brand">‹ Volver a Contratos</Link>
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
  const personas = f.empleados.map((e) => ({ value: e.id, label: e.nombre, detalle: e.puesto || null }));
  const jefes = f.empleados.filter((e) => e.id !== form.id_empleado).map((e) => ({ value: e.id, label: e.nombre, detalle: e.puesto || null }));
  // El jefe guardado puede ya no estar activo: se muestra con su nombre igual.
  if (form.jefe_inmediato_id && !jefes.some((j) => j.value === form.jefe_inmediato_id) && contrato?.nombre_jefe) jefes.unshift({ value: form.jefe_inmediato_id, label: contrato.nombre_jefe });
  const servicios = form.tipo_contrato === "prestacion_servicios";
  const opcionesEmpresa = empresas.map((e) => ({ value: String(e.id_empresa), label: e.nombre }));

  // Lista de un catálogo (puesto, departamento, lugar): con buscador y, si se puede, «+ Crear» en ventana chica.
  const sinEmpresa = !form.id_empresa;
  const listaCatalogo = (tipo, campo, { vacio, buscar }) => function controlCatalogo(p) { return (
    <ListaConBuscador {...p} opciones={comoOpciones(catalogos[tipo])} valor={valor(campo)} onCambio={alCambiar(campo)} cargando={catalogos.cargando[tipo]}
      vacio={sinEmpresa ? "Primero elige la empresa" : vacio} buscar={buscar} opcionVacia={valor(campo) ? "Dejar vacío" : null} disabled={soloLectura || sinEmpresa}
      alCrear={puedeCrearEn(tipo, permisosSesion) ? (texto) => setAlta({ tipo, texto, idCampo: `ct-${campo}` }) : null}
      sinResultados={puedeCrearEn(tipo, permisosSesion) ? "No hay coincidencias" : "No está en el catálogo. Pide que lo den de alta en Catálogos."} />
  ); };

  const etiqueta = editar
    ? `Editar contrato ${contrato?.folio ?? ""} · ${TIPOS[form.tipo_contrato] ?? contrato?.tipo_contrato ?? ""}`
    : duplicar ? `Duplicar contrato ${contrato?.folio ?? ""}` : "Contrato nuevo";
  const filas = editar && contrato ? [
    { etiqueta: "Vigencia", valor: vigenciaTexto(contrato) },
    { etiqueta: "Firma", valor: firmaResumen(f.datos?.firma).texto },
  ] : [];

  // ——— Secciones, una debajo de otra ———
  const Persona = (
    <SeccionFormulario id={anclaSeccion("persona")} titulo="Persona y puesto" descripcion="Quién firma el contrato y qué hará." columnas="auto" maxColumnas={4} data-panel="persona">
      {editar ? (
        <>
          <Dato etiqueta="Persona" className={CAMPO_ANCHO} ayuda="La persona no se cambia: para otra, crea un contrato nuevo.">
            <span className="truncate">{contrato?.nombre_empleado}</span>
            <Link href={`/panel/empleados?id=${contrato?.id_empleado}`} className="ml-3 shrink-0 font-semibold text-brand underline underline-offset-2">Ver ficha</Link>
          </Dato>
          <Dato etiqueta="Empresa">{empresaNombre || "—"}</Dato>
        </>
      ) : (
        <>
          {empresas.length > 1 ? (
            <Campo id="ct-id_empresa" etiqueta="Empresa" obligatorio error={errorDe("id_empresa")}>
              {(p) => (empresas.length > MAXIMO_SIN_BUSCADOR
                ? <ListaConBuscador {...p} opciones={opcionesEmpresa} valor={valor("id_empresa")} onCambio={alCambiar("id_empresa")} vacio="Elige la empresa" buscar="Buscar empresa…" />
                : <Lista {...p} opciones={opcionesEmpresa} valor={valor("id_empresa")} onCambio={alCambiar("id_empresa")} vacio="Elige la empresa" />)}
            </Campo>
          ) : <Dato etiqueta="Empresa">{empresaNombre || "—"}</Dato>}
          <Campo id="ct-id_empleado" etiqueta="Persona" obligatorio error={errorDe("id_empleado")} ayuda={sinEmpresa ? "Primero elige la empresa." : null}>
            {(p) => <ListaConBuscador {...p} disabled={sinEmpresa} opciones={personas} valor={valor("id_empleado")} onCambio={alCambiar("id_empleado")}
              cargando={f.cargandoPersonas} vacio="Elige a la persona" buscar="Buscar por nombre o puesto…" sinResultados="Nadie con ese nombre." />}
          </Campo>
        </>
      )}
      <Campo id="ct-puesto" etiqueta="Puesto" error={errorDe("puesto")}>
        {listaCatalogo("puesto", "puesto", { vacio: "Elige el puesto", buscar: "Buscar puesto…" })}
      </Campo>
      <Campo id="ct-departamento" etiqueta="Departamento o área">
        {listaCatalogo("departamento", "departamento", { vacio: "Elige el departamento", buscar: "Buscar departamento…" })}
      </Campo>
      <Campo id="ct-jefe_inmediato_id" etiqueta="Jefe inmediato">
        {(p) => <ListaConBuscador {...p} opciones={jefes} valor={valor("jefe_inmediato_id")} onCambio={alCambiar("jefe_inmediato_id")} opcionVacia="Sin jefe directo"
          vacio="Sin jefe directo" buscar="Buscar por nombre…" sinResultados="Nadie con ese nombre." disabled={soloLectura || sinEmpresa} cargando={f.cargandoPersonas} />}
      </Campo>
      <Campo id="ct-lugar_trabajo" etiqueta="Lugar de trabajo">
        {listaCatalogo("lugar", "lugar_trabajo", { vacio: "Elige la sucursal", buscar: "Buscar sucursal…" })}
      </Campo>
      <Campo id="ct-modalidad_trabajo" etiqueta="Modalidad">
        {(p) => <Lista {...p} opciones={MODALIDADES} valor={valor("modalidad_trabajo")} onCambio={alCambiar("modalidad_trabajo")} disabled={soloLectura} />}
      </Campo>
      {!editar ? <Dato etiqueta="Lo elabora">{[dataUser?.nombre, dataUser?.apellido_paterno].filter(Boolean).join(" ") || "—"}</Dato> : null}
    </SeccionFormulario>
  );

  const tarjeta = editar ? sueldoTarjeta(f.datos?.sueldo) : null;
  const vigente = String(contrato?.estatus ?? "").toLowerCase() === "activo";
  const Sueldo = editar ? (
    <SeccionFormulario id={anclaSeccion("sueldo")} titulo="Sueldo y pago" descripcion="El sueldo que usan la nómina, los finiquitos y los aguinaldos." columnas="auto" data-panel="sueldo">
      <div className="col-span-full flex flex-col gap-3 @[42rem]:flex-row @[42rem]:items-center @[42rem]:justify-between @[42rem]:gap-6" data-sueldo-solo-lectura>
        <div className="flex min-w-0 flex-col gap-1">
          {tarjeta ? (
            <>
              <p className="m-0 text-[26px] font-bold leading-tight" data-sueldo>{tarjeta.principal} <span className="text-[17px] font-medium text-texto-secundario lg:text-[16px]">{tarjeta.sufijo}</span></p>
              <p className="m-0 text-texto-secundario">{tarjeta.detalle}</p>
            </>
          ) : <p className="m-0 text-texto-secundario">Sin sueldo registrado.</p>}
          <p data-chico className="m-0 text-ayuda text-texto-secundario">No se cambia aquí: se cambia con un convenio, para que quede en el historial (antes, después, desde cuándo y quién).</p>
        </div>
        {vigente ? (
          <BotonAccion accion={{ clave: "convenio", texto: "Cambiar sueldo (convenio)", tipo: "contorno", onClick: () => setConvenio(true) }} className="self-start @[42rem]:self-center" />
        ) : <p className="m-0 text-texto-secundario">Este contrato no está vigente: para otro sueldo, renueva el contrato o crea uno nuevo.</p>}
      </div>
    </SeccionFormulario>
  ) : (
    <SeccionFormulario id={anclaSeccion("sueldo")} titulo="Sueldo y pago" descripcion="Lo que gana la persona y cada cuándo se le paga." columnas="auto" maxColumnas={3} data-panel="sueldo">
      {form.periodicidadOrigen ? (
        <Nota tono="aviso" data-aviso-periodicidad className={RENGLON_COMPLETO}>
          El contrato que estás duplicando guarda la periodicidad «{form.periodicidadOrigen}» y los cálculos de la nómina la leen como mensual
          ({dinero(form.salario_base, { centavos: "siempre" })} al mes). Elige cada cuándo se le paga y revisa el sueldo antes de guardar.
        </Nota>
      ) : null}
      <Campo id="ct-periodicidad_pago" etiqueta="¿Cada cuándo se le paga?" obligatorio error={errorDe("periodicidad_pago")}>
        {(p) => <Lista {...p} opciones={PERIODOS} valor={valor("periodicidad_pago")} onCambio={alCambiar("periodicidad_pago")} vacio="Elige una opción" />}
      </Campo>
      <Campo id="ct-salario_base" obligatorio etiqueta={`Sueldo ${porPeriodo(form.periodicidad_pago) || "por periodo"}`} error={errorDe("salario_base")}
        ayuda="Lo que gana en cada periodo de pago, antes de impuestos.">
        {(p) => <input {...p} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={valor("salario_base")} onChange={alCambiar("salario_base")} />}
      </Campo>
      <Campo id="ct-moneda" etiqueta="Moneda" obligatorio error={errorDe("moneda")} className={TERCERO_A_LO_ANCHO}>
        {(p) => <Lista {...p} opciones={MONEDAS} valor={valor("moneda")} onCambio={alCambiar("moneda")} />}
      </Campo>
    </SeccionFormulario>
  );

  // Horario y comida: dos horas en un solo renglón («08:00 a 16:00»), así la sección cabe en 4 columnas sin huecos.
  const dosHoras = (p, segundo, error, { primera, otra }) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <input {...p} type="time" aria-label={primera} className={cn(p.className, "min-w-0 flex-1")} value={valor(p.id.slice(3))} onChange={alCambiar(p.id.slice(3))} disabled={soloLectura} />
      <span aria-hidden="true" className="shrink-0 text-texto-secundario">a</span>
      <input id={`ct-${segundo}`} type="time" aria-label={otra} data-variante="linea" aria-invalid={error ? true : undefined} aria-describedby={p["aria-describedby"]}
        className={claseControl(error, "min-w-0 flex-1", "linea")} value={valor(segundo)} onChange={alCambiar(segundo)} disabled={soloLectura} />
    </div>
  );
  const Jornada = (
    <SeccionFormulario id={anclaSeccion("jornada")} titulo="Jornada y horario" descripcion="Cuántas horas trabaja y en qué horario." columnas="auto" maxColumnas={4} data-panel="jornada"
      // Las dos horas de un renglón necesitan ~260 px para no cortar «09:00 a. m.»: de 416 a 672 px van a lo ancho; de 672
      // a 960, dos por renglón; desde 960, cuatro con las horas más anchas que «Horas a la semana».
      className="@[42rem]:grid-cols-2 @[60rem]:grid-cols-[1fr_0.6fr_1.2fr_1.2fr]">
      {!form.horario_reconocido ? (
        <Nota tono="aviso" className={RENGLON_COMPLETO} data-horario-guardado>
          Horario guardado: «{form.horario_original}». Se queda tal cual; si escribes la entrada y la salida, se reemplaza por las horas que pongas.
        </Nota>
      ) : null}
      <Campo id="ct-tipo_jornada" etiqueta="Tipo de jornada">
        {(p) => <Lista {...p} opciones={JORNADAS} valor={valor("tipo_jornada")} onCambio={alCambiar("tipo_jornada")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-horas_semanales" etiqueta="Horas a la semana" error={errorDe("horas_semanales")} ayuda="Diurna: máximo 48.">
        {(p) => <input {...p} type="number" inputMode="decimal" min="1" max="168" step="0.5" value={valor("horas_semanales")} onChange={alCambiar("horas_semanales")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-hora_entrada" etiqueta="Horario (entrada y salida)" error={errorDe("hora_entrada")} className={HORAS_ANCHO}>
        {(p) => dosHoras(p, "hora_salida", errorDe("hora_entrada"), { primera: "Entrada", otra: "Salida" })}
      </Campo>
      <Campo id="ct-hora_comida_inicio" etiqueta="Comida (empieza y termina)" error={errorDe("hora_comida_inicio")} ayuda="Vacío si no tiene horario de comida." className={HORAS_ANCHO}>
        {(p) => dosHoras(p, "hora_comida_fin", errorDe("hora_comida_inicio"), { primera: "Comida: empieza", otra: "Comida: termina" })}
      </Campo>
    </SeccionFormulario>
  );

  const Prestaciones = servicios ? (
    <SeccionFormulario id={anclaSeccion("prestaciones")} titulo="Prestaciones" columnas="auto" data-panel="prestaciones">
      <Nota className={RENGLON_COMPLETO}>La prestación de servicios no es una relación laboral: no lleva vacaciones, prima vacacional ni aguinaldo de ley.</Nota>
    </SeccionFormulario>
  ) : (
    <SeccionFormulario id={anclaSeccion("prestaciones")} titulo="Prestaciones" descripcion="Lo que la ley pide como mínimo, o más si tu empresa lo da." columnas="auto" maxColumnas={3} data-panel="prestaciones">
      <Campo id="ct-dias_vacaciones" etiqueta="Días de vacaciones" error={errorDe("dias_vacaciones")}
        ayuda={f.vacacionesLey ? `La ley pide ${f.vacacionesLey.dias} días en el año ${f.vacacionesLey.anio} (art. 76). Puedes dar más.` : "La ley pide 12 días el primer año, 14 el segundo… (art. 76)."}>
        {(p) => <input {...p} type="number" inputMode="numeric" min="0" value={valor("dias_vacaciones")} onChange={alCambiar("dias_vacaciones")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-aguinaldo_dias" etiqueta="Días de aguinaldo" error={errorDe("aguinaldo_dias")} ayuda="Al menos 15 días (art. 87).">
        {(p) => <input {...p} type="number" inputMode="numeric" min="15" value={valor("aguinaldo_dias")} onChange={alCambiar("aguinaldo_dias")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-prima_vacacional" etiqueta="Prima vacacional (%)" error={errorDe("prima_vacacional")} ayuda="Al menos 25 % (art. 80).">
        {(p) => <input {...p} type="number" inputMode="decimal" min="25" step="0.01" value={valor("prima_vacacional")} onChange={alCambiar("prima_vacacional")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-prestaciones_superiores" etiqueta="Otras prestaciones" className={CUARTO_A_LO_ANCHO} ayuda="Sepáralas con comas. Ej.: Vales de despensa, Seguro de gastos médicos.">
        {(p) => <textarea {...p} className={cn(p.className, CLASE_TEXTO_LARGO_LINEA)} rows={1} value={valor("prestaciones_superiores")} onChange={alCambiar("prestaciones_superiores")} disabled={soloLectura} />}
      </Campo>
    </SeccionFormulario>
  );

  const Documento = (
    <SeccionFormulario id={anclaSeccion("documento")} titulo="Documento" descripcion="Tipo de contrato, fechas y la causa u obra." columnas="auto" maxColumnas={3} data-panel="documento">
      <Campo id="ct-tipo_contrato" etiqueta="Tipo de contrato" obligatorio error={errorDe("tipo_contrato")} ayuda="Con el tipo se elige la plantilla del documento.">
        {(p) => <Lista {...p} opciones={TIPOS_OPCIONES} valor={valor("tipo_contrato")} onCambio={alCambiar("tipo_contrato")} vacio={form.tipo_contrato ? null : "Elige el tipo"} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-fecha_inicio" etiqueta="Inicia el" obligatorio error={errorDe("fecha_inicio")}>
        {(p) => <input {...p} type="date" value={valor("fecha_inicio")} onChange={alCambiar("fecha_inicio")} disabled={soloLectura} />}
      </Campo>
      <Campo id="ct-fecha_fin" etiqueta="Termina el" error={errorDe("fecha_fin")} ayuda={pideFechaFin(form.tipo_contrato) ? null : "No aplica a este tipo de contrato."}>
        {(p) => <input {...p} type="date" min={form.fecha_inicio || undefined} value={valor("fecha_fin")} onChange={alCambiar("fecha_fin")} disabled={soloLectura || (!pideFechaFin(form.tipo_contrato) && !form.fecha_fin)} />}
      </Campo>
      <Campo id="ct-notas" etiqueta="Causa u obra, y notas" className={CUARTO_A_LO_ANCHO}
        ayuda="Si es por tiempo u obra determinado, escribe aquí la causa o la obra: aparece en el texto del contrato.">
        {(p) => <textarea {...p} className={cn(p.className, CLASE_TEXTO_LARGO_LINEA)} rows={1} value={valor("notas")} onChange={alCambiar("notas")} disabled={soloLectura} />}
      </Campo>
    </SeccionFormulario>
  );

  // Índice: ✓ o «Falta N» por sección con la misma revisión que «Guardar» (sin marcar en rojo hasta intentar guardar).
  const porSeccion = faltanPorPaso(soloLectura ? [] : f.faltantes);
  const secciones = PESTANAS.map((p) => ({ clave: p.clave, texto: p.texto, faltan: porSeccion[p.clave] ?? 0 }));
  const resumen = resumenContrato({ form, nombrePersona: nombre, sueldoServidor: f.datos?.sueldo, editar });
  const faltanTotal = soloLectura ? 0 : f.faltantes.length;

  // Estado de la barra de abajo, junto a Guardar.
  const estado = soloLectura ? null : errores.length ? (
    <span className="font-semibold text-peligro-texto" data-estado-barra="errores">Faltan o hay que corregir {datos(errores.length)}</span>
  ) : f.sucio ? (
    <span className="font-semibold text-estado-aviso-texto" data-sin-guardar data-estado-barra="sin-guardar">Tienes cambios sin guardar{!editar && faltanTotal ? ` · faltan ${datos(faltanTotal)}` : ""}</span>
  ) : (
    <span data-estado-barra="listo">{editar ? "Sin cambios" : faltanTotal ? `Faltan ${datos(faltanTotal)} para guardar` : "Listo para guardar"}</span>
  );
  const barra = (
    <BarraAccionesFormulario
      etiqueta="Guardar o cancelar"
      enRenglon
      aviso={estado}
      principal={soloLectura
        ? { clave: "volver", texto: "Volver al contrato", onClick: () => router.push(volverA) }
        : { clave: "guardar", texto: editar ? "Guardar cambios" : "Guardar contrato", onClick: alGuardar, cargando: guardando }}
      cancelar={soloLectura ? null : { onClick: cancelar, deshabilitado: guardando }}
      className="lg:px-8 lg:py-3"
    />
  );

  const encabezado = (
    <EncabezadoPagina
      completo
      className="lg:px-8 lg:py-4"
      volver={{ href: volverA, texto: editar || duplicar ? `Contrato ${contrato?.folio ?? ""}` : "Contratos" }}
      titulo={editar ? nombre || "Contrato" : duplicar ? `Duplicar contrato ${contrato?.folio ?? ""}` : "Contrato nuevo"}
      descripcion={editar ? [etiqueta, ...filas.map((x) => `${x.etiqueta}: ${x.valor}`)].filter(Boolean).join(" · ") : null}
      acciones={editar && contrato ? (
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
          <EtiquetaEstado tono={estadoContrato(contrato.estatus).tono}>{estadoContrato(contrato.estatus).texto}</EtiquetaEstado>
          {/* La vista del documento vive en el contrato (con lo ya guardado). Se abre en otra pestaña para no perder lo
              que estás capturando. Al crear todavía no hay documento: no se muestra. */}
          <Button asChild variant="outline" data-accion="ver-documento">
            <a href={`/panel/contratos/${id}#documento`} target="_blank" rel="noopener" title="Ver el documento guardado (se abre en otra pestaña)">
              Ver documento <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      ) : null}
    />
  );

  return (
    <EstiloCampos variante="linea">
      <PaginaFormulario
        data-vista="formulario-contrato"
        data-modo={modo}
        ancho="completo"
        encabezado={encabezado}
        barra={barra}
        indice={<IndiceSecciones secciones={secciones} />}
        resumen={<ResumenFormulario filas={resumen.filas} faltan={soloLectura ? null : faltanTextos(f.faltantes)} nota={resumen.nota} />}
      >
        {soloLectura ? <Nota tono="aviso" role="status" data-no-editable>{permiso.motivo}</Nota> : null}
        {errorServidor ? <Nota tono="error" role="alert" data-error-servidor>{errorServidor}</Nota> : null}
        {errores.length ? (
          // Aviso de lo que falta, con un enlace a cada sección. En escritorio queda pegado arriba al bajar, así se ve
          // aunque la pantalla haya bajado a la primera sección con errores.
          <div role="alert" data-errores
            className="z-10 flex flex-col gap-2 rounded-seccion border border-peligro-borde bg-peligro-suave px-4 py-3 text-estado-error-texto min-[75rem]:sticky min-[75rem]:top-4 min-[75rem]:flex-row min-[75rem]:flex-wrap min-[75rem]:items-center min-[75rem]:gap-x-4">
            <p className="m-0 font-bold">Faltan o hay que corregir {datos(errores.length)}:</p>
            <div className="flex flex-wrap gap-2">
              {PESTANAS.filter((p) => cuantos(p.clave)).map((p) => (
                <Button key={p.clave} variant="destructive-outline" data-ir-seccion={p.clave} onClick={() => irASeccion(p.clave)}>
                  {p.texto} ({cuantos(p.clave)})
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={cn("flex min-w-0 flex-col gap-4 lg:gap-5", errores.length && "min-[75rem]:[&_[data-seccion-formulario]]:scroll-mt-28")}>
          {Persona}
          {Sueldo}
          {Jornada}
          {Prestaciones}
          {Documento}
        </div>

        {editar && contrato ? (
          <ConvenioDialog abierto={convenio} alCerrar={() => setConvenio(false)} contrato={contrato}
            alGuardar={(mensaje) => { setConvenio(false); enqueueSnackbar(mensaje, { variant: "success" }); f.mutarDetalle(); }} />
        ) : null}
        <VentanaAltaCatalogo alta={alta} idEmpresa={form.id_empresa} empresa={empresaNombre} alCerrar={() => setAlta(null)}
          alCreado={(tipo, nombreNuevo) => {
            catalogos.refrescar(tipo, nombreNuevo);
            f.cambiar(alta?.idCampo?.slice(3) ?? "", nombreNuevo);
          }} />
      </PaginaFormulario>
    </EstiloCampos>
  );
}
