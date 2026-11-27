"use client";

// Vista de detalle del contrato (27/11/2026, maqueta aprobada «Main» y «ContratoMovil»). Es la pantalla principal al
// abrir un contrato: encabezado con la persona, folio, tipo, estado, vigencia y firma; una sola acción principal; las
// tarjetas Sueldo (el que usan nómina, finiquitos y aguinaldos), Jornada, Prestaciones e Historial; y el documento con
// el estado de las dos firmas. Piezas reutilizables en src/components/detalle (docs/vistas-de-detalle.md).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  EncabezadoDetalle, BarraAcciones, BarraAccionesMovil, EspacioBarraMovil, TarjetaDetalle, FilaDato, ListaDatos, LineaDeTiempo, EstadoFirma, Pastilla,
} from "@/components/detalle";
import EvidenciaFirma from "@/components/firma/EvidenciaFirma";
import { contratosApi } from "@/lib/contratosApi";
import { htmlToPdf } from "@/lib/htmlToPdf";
import { nombreArchivoPdf } from "@/lib/nombreArchivo.mjs";
import { limpiarHtmlContrato } from "@/lib/contratos/htmlContrato.mjs";
import {
  TIPOS, estadoContrato, estaCerrado, vigenciaTexto, alertaVence, firmaResumen, firmantes, accionPrimaria, ETIQUETA_ACCION, lineaDeTiempo,
  sueldoTarjeta, iniciales, horarioCorto, dinero, porPeriodo, fechaCorta, mensajeDeError,
} from "@/lib/contratos/detalleContrato.mjs";
import { ConvenioDialog, RenovarDialog, TerminarDialog, FirmarEmpresaDialog, MandarAFirmarDialog } from "./DialogosContrato";

const separarPrestaciones = (t) => String(t ?? "").split(/\s*(?:,|;|\n|\by\b)\s*/i).map((x) => x.trim()).filter(Boolean);

export default function DetalleContrato({ id }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth() ?? {};
  const [dialogo, setDialogo] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(id ? ["contrato-detalle", id] : null, () => contratosApi.detalle(id), { revalidateOnFocus: false });
  const { data: doc, mutate: mutarDoc } = useSWR(id ? ["contrato-documento", id] : null, () => contratosApi.documento(id), { revalidateOnFocus: false });

  const c = data?.contrato;
  const firma = data?.firma;
  const quien = [dataUser?.nombre, dataUser?.apellido_paterno].filter(Boolean).join(" ") || null;
  const actualizar = (mensaje) => {
    setDialogo(null);
    if (mensaje) enqueueSnackbar(mensaje, { variant: "success" });
    mutate();
    mutarDoc();
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      if (c?.tiene_pdf) {
        const r = await contratosApi.urlPdf(c.id);
        if (r?.url) { window.open(r.url, "_blank", "noopener"); return; }
      }
      if (!doc?.html) throw new Error("Este contrato todavía no tiene documento: elige una plantilla.");
      await htmlToPdf(doc.html, `Contrato ${c.folio}`, { nombreArchivo: nombreArchivoPdf({ documento: "Contrato", folio: c.folio, empleado: c.id_empleado }) });
    } catch (e) {
      enqueueSnackbar(mensajeDeError(e, "No se pudo descargar el PDF."), { variant: "error" });
    } finally {
      setDescargando(false);
    }
  };

  const acciones = useMemo(() => {
    if (!c) return {};
    const cerrado = estaCerrado(c.estatus);
    const vigente = String(c.estatus).toLowerCase() === "activo";
    const principal = accionPrimaria({ contrato: c, firma });
    const definiciones = {
      firmar_empresa: { onClick: () => setDialogo("firmar_empresa") },
      mandar_firmar: { onClick: () => setDialogo("mandar_firmar") },
      reenviar: { onClick: () => setDialogo("reenviar") },
      descargar: { onClick: descargar, cargando: descargando },
    };
    const accion = (clave, extra = {}) => ({ clave, texto: ETIQUETA_ACCION[clave], ...definiciones[clave], ...extra });
    const lista = [
      accion(principal, { tipo: "primaria" }),
      principal !== "mandar_firmar" && principal !== "reenviar" && !cerrado && !firma?.empleado?.firmado && principal !== "firmar_empresa"
        ? accion("mandar_firmar", { tipo: "contorno" }) : null,
      principal === "firmar_empresa" && !firma?.empleado?.firmado
        ? accion(firma?.solicitud && ["pendiente", "abierto"].includes(firma.solicitud.estatus) ? "reenviar" : "mandar_firmar", { tipo: "contorno" }) : null,
      principal !== "descargar" ? accion("descargar", { tipo: "contorno" }) : null,
      vigente ? { clave: "convenio", texto: "Cambiar sueldo (convenio)", onClick: () => setDialogo("convenio") } : null,
      !cerrado ? { clave: "renovar", texto: "Renovar", onClick: () => setDialogo("renovar") } : null,
      !cerrado ? { clave: "terminar", texto: "Terminar contrato", onClick: () => setDialogo("terminar") } : null,
      {
        // (27/11/2026) Se edita en su página con pestañas (antes, una ventana que se veía con campos en blanco).
        clave: "editar", texto: "Editar datos", tipo: "texto", href: `/panel/contratos/${c.id}/editar`, deshabilitada: c.congelado || cerrado,
        ayuda: c.congelado ? "Ya se mandó a firmar o está firmado: su texto no cambia. Usa «Cambiar sueldo (convenio)» o «Renovar»." : undefined,
      },
    ].filter(Boolean);
    return { lista, principal: lista[0], resto: lista.slice(1) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, firma, descargando, doc?.html]);

  if (isLoading) {
    return <div className="flex items-center justify-center gap-2 py-24 text-[17px] text-[#374151]"><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Cargando contrato…</div>;
  }
  if (error || !c) {
    const estado = error?.response?.status;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-16 text-[17px] text-[#111827]">
        <h1 className="m-0 text-[24px] font-bold">{estado === 404 ? "No encontramos este contrato" : estado === 403 ? "No tienes acceso a este contrato" : "No se pudo abrir el contrato"}</h1>
        <p className="m-0 text-[#374151]">{mensajeDeError(error, "Intenta de nuevo en un momento.")}</p>
        <Link href="/panel/contratos" className="inline-flex min-h-12 items-center font-semibold text-[#1E40C4]">‹ Volver a Contratos</Link>
      </div>
    );
  }

  const estado = estadoContrato(c.estatus);
  const resumenFirma = firmaResumen(firma);
  const vence = alertaVence(data.vigencia?.dias_para_vencer);
  const sueldo = sueldoTarjeta(data.sueldo);
  const prestaciones = separarPrestaciones(c.prestaciones_superiores);
  const vacaciones = Math.max(Number(data.vacaciones_ley) || 0, Number(c.dias_vacaciones) || 0);
  const subtitulo = (
    <p className="m-0">
      {[c.puesto, c.departamento, c.lugar_trabajo || c.sucursal].filter(Boolean).join(" · ")}
      {" · "}
      <Link href={`/panel/empleados?id=${c.id_empleado}`}>Ver ficha</Link>
    </p>
  );
  const filas = [
    { etiqueta: "Vigencia", valor: vigenciaTexto(c) },
    { etiqueta: "Firma", valor: resumenFirma.texto, tono: resumenFirma.tono === "exito" ? "exito" : "aviso" },
  ];
  const avisos = [
    data.sueldo?.diferencia_ficha && data.sueldo.es_el_vigente ? {
      clave: "diferencia", tono: "aviso",
      texto: <>La ficha dice {dinero(data.sueldo.diferencia_ficha.sueldo_ficha, { centavos: "siempre" })} {porPeriodo(data.sueldo.diferencia_ficha.periodo_ficha)} y el contrato {dinero(data.sueldo.diferencia_ficha.contrato_en_periodo_ficha, { centavos: "siempre" })}. Mientras no lo resuelvas no se autoriza la nómina. <Link href="/panel/contratos/revisar-sueldos" className="font-semibold text-[#1E40C4] underline">Revisar sueldos</Link></>,
    } : null,
    data.sueldo?.periodicidad_por_confirmar ? {
      clave: "periodicidad", tono: "aviso",
      texto: <>Este contrato dice que se paga «{data.sueldo.periodicidad_por_confirmar.guardada ?? "sin periodicidad"}» y los cálculos lo están pagando como <b>mensual</b>. Confírmalo en <Link href="/panel/contratos/revisar-sueldos" className="font-semibold text-[#1E40C4] underline">Revisar sueldos</Link>; mientras tanto no se autoriza la nómina.</>,
    } : null,
    data.otros_vigentes?.length ? {
      clave: "duplicado", tono: "error",
      texto: <>Esta persona tiene otro contrato vigente ({data.otros_vigentes.map((o) => o.folio).join(", ")}). Solo puede haber uno: <Link href="/panel/contratos/revisar-sueldos" className="font-semibold text-[#1E40C4] underline">elige cuál se queda</Link>.</>,
    } : null,
    vence ? { clave: "vence", tono: vence.tono, texto: <>{vence.texto}. {estaCerrado(c.estatus) ? null : "Decide a tiempo si lo renuevas."}</> } : null,
  ].filter(Boolean);

  const plantilla = doc?.plantilla;
  const enlacePlantilla = plantilla?.id_plantilla
    ? `/panel/gestion-documental/plantillas/editor?id=${plantilla.id_plantilla}`
    : "/panel/gestion-documental/plantillas?pestana=contratos";

  const TarjetaSueldo = (
    <TarjetaDetalle titulo="Sueldo" data-tarjeta="sueldo"
      nota={data.sueldo?.es_el_vigente ? "Este es el sueldo que usan la nómina, los finiquitos y los aguinaldos."
        : estaCerrado(c.estatus) ? "Este contrato ya no está vigente: la nómina usa el sueldo del contrato vigente o, si no hay, el de la ficha." : null}>
      {sueldo ? (
        <>
          <p className="m-0 mt-1 text-[26px] font-bold leading-tight lg:text-[30px]" data-sueldo>
            {sueldo.principal} <span className="text-[17px] font-medium text-[#374151] lg:text-[16px]">{sueldo.sufijo}</span>
          </p>
          <p className="m-0 text-[#374151]">{sueldo.detalle}</p>
        </>
      ) : <p className="m-0 text-[#374151]">Sin sueldo registrado.</p>}
      {data.convenios?.length ? (
        <p className="m-0 text-[#374151]">Último cambio: convenio del {fechaCorta(data.convenios[0].fecha_efectiva)} ({dinero(data.convenios[0].salario_anterior, { centavos: "siempre" })} → {dinero(data.convenios[0].salario_nuevo, { centavos: "siempre" })}).</p>
      ) : null}
    </TarjetaDetalle>
  );
  const TarjetaJornada = (
    <TarjetaDetalle titulo="Jornada" data-tarjeta="jornada">
      <ListaDatos>
        <FilaDato etiqueta="Tipo" valor={c.tipo_jornada ? `${String(c.tipo_jornada).charAt(0).toUpperCase()}${String(c.tipo_jornada).slice(1)}` : "—"} />
        <FilaDato etiqueta="Horario" valor={horarioCorto(c.horario) || "—"} />
        <FilaDato etiqueta="Horas a la semana" valor={c.horas_semanales ? `${c.horas_semanales} h` : "—"} />
        <FilaDato etiqueta="Descanso" valor={c.descanso ? `${c.descanso.charAt(0).toUpperCase()}${c.descanso.slice(1)}` : "—"} />
        <FilaDato etiqueta="Modalidad" valor={c.modalidad_trabajo ? `${String(c.modalidad_trabajo).charAt(0).toUpperCase()}${String(c.modalidad_trabajo).slice(1)}` : "—"} />
      </ListaDatos>
    </TarjetaDetalle>
  );
  const TarjetaPrestaciones = (
    <TarjetaDetalle titulo="Prestaciones" data-tarjeta="prestaciones">
      <ListaDatos>
        <FilaDato etiqueta="Vacaciones este año" valor={vacaciones ? `${vacaciones} días${vacaciones === Number(data.vacaciones_ley) ? " (ley)" : ""}` : "—"} />
        <FilaDato etiqueta="Prima vacacional" valor={`${Math.max(25, Number(c.prima_vacacional) || 0)} %`} />
        <FilaDato etiqueta="Aguinaldo" valor={`${Math.max(15, Number(c.aguinaldo_dias) || 0)} días`} />
      </ListaDatos>
      {prestaciones.length ? (
        <ul aria-label="Otras prestaciones" className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
          {prestaciones.map((p) => <li key={p} className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[17px] text-[#1E40C4] lg:text-[16px]">{p}</li>)}
        </ul>
      ) : null}
    </TarjetaDetalle>
  );
  const TarjetaHistorial = (
    <TarjetaDetalle titulo="Historial" data-tarjeta="historial" className="lg:flex-1">
      <LineaDeTiempo eventos={lineaDeTiempo(data.eventos ?? [])} vacio="Todavía no hay movimientos registrados." />
      {data.cadena?.anterior ? <p className="m-0 mt-1 text-[#374151]">Renovación de <Link className="font-semibold text-[#1E40C4]" href={`/panel/contratos/${data.cadena.anterior.id}`}>{data.cadena.anterior.folio}</Link></p> : null}
      {data.cadena?.siguiente ? <p className="m-0 text-[#374151]">Se renovó con <Link className="font-semibold text-[#1E40C4]" href={`/panel/contratos/${data.cadena.siguiente.id}`}>{data.cadena.siguiente.folio}</Link></p> : null}
    </TarjetaDetalle>
  );
  const TarjetaDocumento = (
    <TarjetaDetalle titulo="El documento" id="documento" data-tarjeta="documento" className="scroll-mt-4"
      accion={plantilla?.nombre ? <Link href={enlacePlantilla} className="inline-flex min-h-12 items-center text-[17px] font-semibold text-[#1E40C4] no-underline lg:text-[16px]">Plantilla: «{plantilla.nombre}»</Link> : null}>
      {doc?.faltantes?.length ? (
        <p role="status" className="m-0 rounded-xl bg-[#FFF7ED] px-3 py-2.5 text-[#9A3412]" data-faltantes>
          Faltan datos para poder firmarlo: {doc.faltantes.map((f) => f.etiqueta).join(", ")}. <Link href={`/panel/empleados?id=${c.id_empleado}`} className="font-semibold text-[#9A3412] underline">Complétalos en la ficha</Link>.
        </p>
      ) : null}
      {doc?.congelado ? <p className="m-0 text-[#374151]">Texto fijo desde que se mandó a firmar: cambiar la plantilla ya no lo cambia.</p> : null}
      {doc?.html ? (
        <div className="max-h-[420px] min-h-0 overflow-y-auto overflow-x-hidden break-words rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 text-[17px] leading-relaxed text-[#1F2937] lg:max-h-[520px] lg:flex-1 lg:text-[16px] [&_h1]:text-[18px] [&_h1]:font-bold [&_h2]:text-[17px] [&_h2]:font-bold [&_p]:my-2 [&_table]:w-full [&_table]:table-fixed"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} data-documento dangerouslySetInnerHTML={{ __html: limpiarHtmlContrato(doc.html) }} />
      ) : doc?.sin_plantilla ? (
        <p className="m-0 text-[#374151]">No hay plantilla para este tipo de contrato. <Link href="/panel/gestion-documental/plantillas?pestana=contratos" className="font-semibold text-[#1E40C4]">Crea una en Plantillas</Link>.</p>
      ) : <p className="m-0 text-[#374151]">Preparando el documento…</p>}
      <EstadoFirma firmantes={firmantes(firma, c.nombre_empleado)} />
      {firma?.solicitud?.estatus === "firmado" ? <EvidenciaFirma idSolicitud={firma.solicitud.id} idEmpresa={c.id_empresa} /> : null}
    </TarjetaDetalle>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 text-[17px] text-[#111827] lg:gap-[18px] lg:text-[16px]" data-vista="detalle-contrato">
      <EncabezadoDetalle
        volver={{ href: "/panel/contratos", texto: "Contratos" }}
        iniciales={iniciales(c.nombre_empleado)}
        etiqueta={`Contrato ${c.folio} · ${TIPOS[c.tipo_contrato] ?? c.tipo_contrato ?? ""}`}
        titulo={c.nombre_empleado}
        subtitulo={subtitulo}
        estado={estado}
        filas={filas}
        alerta={vence}
      />
      <BarraAcciones acciones={acciones.lista} etiqueta="Acciones del contrato" />

      {avisos.length ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          {avisos.map((a) => (
            <p key={a.clave} className="m-0 rounded-2xl px-4 py-3" style={{ background: a.tono === "error" ? "#FEF2F2" : "#FFF7ED", color: a.tono === "error" ? "#991B1B" : "#9A3412" }} data-aviso={a.clave}>{a.texto}</p>
          ))}
        </div>
      ) : null}
      {data.migracion === false ? (
        <p className="m-0 rounded-2xl bg-[#EEF2FF] px-4 py-3 text-[#1E3A8A]">El historial, los convenios y la firma desde el panel se activan cuando ADAMIA termine de actualizar tu cuenta.</p>
      ) : null}


      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex min-w-0 flex-col gap-4">{TarjetaSueldo}
        {/* Celular: el resumen que en escritorio va en el encabezado. */}
        <TarjetaDetalle titulo="Resumen" className="lg:hidden" data-tarjeta="resumen-movil">
          <ListaDatos>
            <FilaDato etiqueta="Vigencia" valor={vigenciaTexto(c)} />
            <FilaDato etiqueta="Horario" valor={horarioCorto(c.horario) || "—"} />
            <FilaDato etiqueta="Firma de la persona" valor={firma?.empleado?.firmado ? "Firmó" : "Pendiente"} tono={firma?.empleado?.firmado ? "exito" : "aviso"} />
            <FilaDato etiqueta="Firma de la empresa" valor={firma?.empresa?.firmado ? "Firmó" : "Pendiente"} tono={firma?.empresa?.firmado ? "exito" : "aviso"} />
          </ListaDatos>
          {vence ? <Pastilla texto={vence.texto} tono={vence.tono} className="self-start" /> : null}
        </TarjetaDetalle>
          {TarjetaJornada}</div>
        <div className="flex min-w-0 flex-col gap-4">{TarjetaPrestaciones}{TarjetaHistorial}</div>
        <div className="flex min-w-0 flex-col gap-4">{TarjetaDocumento}</div>
      </div>
      <EspacioBarraMovil />

      <BarraAccionesMovil
        primaria={acciones.principal}
        secundaria={{ clave: "ver-documento", texto: "Ver el documento", onClick: () => document.getElementById("documento")?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
        mas={acciones.resto}
      />

      <FirmarEmpresaDialog abierto={dialogo === "firmar_empresa"} alCerrar={() => setDialogo(null)} contrato={c} quien={quien} alGuardar={actualizar} />
      <MandarAFirmarDialog abierto={dialogo === "mandar_firmar" || dialogo === "reenviar"} soloEnlace={dialogo === "reenviar"} alCerrar={() => setDialogo(null)} contrato={c}
        alGuardar={() => { mutate(); mutarDoc(); }} />
      <ConvenioDialog abierto={dialogo === "convenio"} alCerrar={() => setDialogo(null)} contrato={c} alGuardar={actualizar} />
      <RenovarDialog abierto={dialogo === "renovar"} alCerrar={() => setDialogo(null)} contrato={c}
        alGuardar={(nuevo) => { setDialogo(null); enqueueSnackbar(`Contrato renovado: ${nuevo.folio}.`, { variant: "success" }); router.push(`/panel/contratos/${nuevo.id}`); }} />
      <TerminarDialog abierto={dialogo === "terminar"} alCerrar={() => setDialogo(null)} contrato={c} alGuardar={actualizar} />
    </div>
  );
}
