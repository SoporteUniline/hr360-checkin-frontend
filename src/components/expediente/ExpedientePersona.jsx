"use client";

// Expediente laboral por etapas de UNA persona (28/11/2026). Tres secciones —Ingreso, Durante la relación y Salida— con
// su lista de pasos de ley (hecho / falta / no aplica) y sus carpetas (documentos propios y lo que viene de otros
// módulos). Exportar el expediente organizado o el paquete para juicio en ZIP. Es una página, no una ventana.
// Backend: /checador/expediente/persona/:id (hr360-checkin-backend/docs/expediente-ley.md).
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { documentosApi, expedienteApi } from "@/lib/expedienteApi";
import { leerErrorBlob, mensajeError, nombreDescarga, ordenarCarpetas, pendientesEtapa, textoResumen, tonoPorcentaje, fechaMx } from "@/lib/expediente/presentacion.mjs";
import { useEmpresaNomina } from "@/components/nomina/comun";
import PasoLey from "./PasoLey";
import Carpeta from "./Carpeta";
import { Aviso, Barra, BOTON_PRINCIPAL, BOTON_SECUNDARIO, CAMPO, Cargando, Encabezado, Etiqueta, Seccion, SECUNDARIO, TEXTO } from "./Piezas";

const guardarBlob = (respuesta, porDefecto) => {
  const enlace = URL.createObjectURL(respuesta.data);
  const a = document.createElement("a");
  a.href = enlace;
  a.download = nombreDescarga(respuesta.headers?.["content-disposition"], porDefecto);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(enlace), 60000);
};

export default function ExpedientePersona({ id }) {
  const { enqueueSnackbar } = useSnackbar();
  const params = useSearchParams();
  const { idEmpresa } = useEmpresaNomina(params.get("empresa"));
  const empresa = Number(params.get("empresa")) || idEmpresa;
  const clave = empresa ? `/checador/expediente/persona/${id}?empresa=${empresa}` : null;
  const { data, error, isLoading, mutate } = useSWR(clave, () => expedienteApi.persona(id, empresa));
  const { data: reglas } = useSWR("/checador/expediente/reglas", () => expedienteApi.reglas());
  const [exportando, setExportando] = useState(null);
  const [salida, setSalida] = useState(null); // null | "confirmar"
  const [motivoSalida, setMotivoSalida] = useState("");

  const clavesPorCarpeta = useMemo(() => {
    const mapa = {};
    for (const c of reglas?.claves_documento ?? []) (mapa[c.carpeta] ??= []).push(c);
    return mapa;
  }, [reglas]);

  const avisar = (texto, variante = "success") => enqueueSnackbar(texto, { variant: variante });
  const conError = async (fn, exito, porDefecto) => {
    try {
      await fn();
      if (exito) avisar(exito);
      await mutate();
    } catch (err) {
      avisar(mensajeError(err, porDefecto), "error");
      throw new Error(mensajeError(err, porDefecto));
    }
  };

  const subir = async (claveLey, datos) => {
    datos.append("empresa_id", String(empresa));
    datos.append("clave_ley", claveLey);
    await conError(() => documentosApi.subir(id, datos), "Documento guardado en el expediente.", "No se pudo subir el documento.");
  };
  const acciones = {
    subir,
    ver: async (doc) => {
      try {
        const { url } = await documentosApi.obtenerUrlTemporal(doc.id);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        avisar(mensajeError(err, "No se pudo abrir el documento."), "error");
      }
    },
    archivar: (doc) => conError(() => documentosApi.archivar(doc.id), "Documento archivado. Se conserva.", "No se pudo archivar.").catch(() => {}),
    restaurar: (doc) => conError(() => documentosApi.restaurar(doc.id), "Documento restaurado.", "No se pudo restaurar.").catch(() => {}),
    reemplazar: (doc, datos) => conError(() => documentosApi.reemplazar(doc.id, datos), "Versión nueva guardada; la anterior se conserva.", "No se pudo reemplazar."),
    depurar: (doc) => conError(() => documentosApi.eliminar(doc.id, { confirmar: true }), "Documento depurado. Quedó en la bitácora.", "No se pudo depurar.").catch(() => {}),
  };
  const marcar = (item, estado, nota) => conError(() => expedienteApi.marcarPaso(id, item.clave, { empresa_id: empresa, estado, nota }),
    estado === "hecho" ? "Paso marcado como hecho." : estado === "no_aplica" ? "Paso marcado como «no aplica»." : "Marca quitada.", "No se pudo marcar el paso.").catch(() => {});

  const exportar = async (modo) => {
    setExportando(modo);
    try {
      const r = await expedienteApi.exportar(id, empresa, modo);
      guardarBlob(r, modo === "juicio" ? "Paquete-juicio.zip" : "Expediente.zip");
      avisar(modo === "juicio" ? "Paquete para juicio descargado." : "Expediente descargado.");
      mutate();
    } catch (err) {
      await leerErrorBlob(err);
      avisar(mensajeError(err, "No se pudo exportar el expediente."), "error");
    } finally {
      setExportando(null);
    }
  };

  const cambiarSalida = async (iniciar) => {
    await conError(() => (iniciar ? expedienteApi.iniciarSalida(id, { empresa_id: empresa, motivo: motivoSalida }) : expedienteApi.cancelarSalida(id, empresa)),
      iniciar ? "Salida iniciada: ya ves sus pasos." : "Salida cancelada.", "No se pudo cambiar la salida.").catch(() => {});
    setSalida(null);
    setMotivoSalida("");
  };

  if (error) return <div className="p-4"><Aviso tono="rojo" titulo="No se pudo abrir el expediente">{mensajeError(error, "Intenta de nuevo.")}</Aviso></div>;
  if (isLoading || !data) return <Cargando texto="Cargando el expediente…" />;
  const p = data.persona;
  const r = data.resumen;
  const subtitulo = [p.puesto, p.departamento, p.sucursal, `No. ${p.id_empleado}`, p.fecha_ingreso ? `Ingreso ${fechaMx(p.fecha_ingreso)}` : null,
    p.activo ? null : `Baja ${p.fecha_baja ? fechaMx(p.fecha_baja) : "sin fecha registrada"}`].filter(Boolean).join(" · ");

  return (
    <div data-pagina="expediente-persona" className={`mx-auto grid max-w-6xl gap-5 p-1 pb-10 text-[#111827] ${TEXTO}`}>
      <Encabezado regreso="/panel/expediente" textoRegreso="Cumplimiento del expediente" titulo={`Expediente de ${p.nombre_completo}`} subtitulo={subtitulo} />

      <Seccion id="cumplimiento" titulo="Lo que pide la ley" acciones={<Etiqueta tono={tonoPorcentaje(r.porcentaje)} data-porcentaje>{r.porcentaje} % completo</Etiqueta>}>
        <Barra porcentaje={r.porcentaje} tono={tonoPorcentaje(r.porcentaje)} />
        <p>{textoResumen(r)}{r.recomendados_faltan ? ` · ${r.recomendados_faltan} recomendados por completar` : ""}</p>
        {(data.avisos ?? []).map((a) => <Aviso key={a.categoria} tono="rojo" titulo={`Categoría «${a.categoria}»`}>{a.aviso}</Aviso>)}
        {!data.migracion && data.puede_editar ? (
          <Aviso tono="ambar" titulo="Falta preparar la base de datos">Puedes ver el expediente, pero marcar pasos, reemplazar documentos y exportar estarán listos cuando soporte de ADAMIA termine la actualización.</Aviso>
        ) : null}
        {data.no_disponibles?.length ? <p className={SECUNDARIO}>Sin consultar en esta cuenta: {data.no_disponibles.join(", ")}.</p> : null}
        {data.puede_exportar ? (
          <div className="flex flex-wrap gap-3">
            <button type="button" className={BOTON_PRINCIPAL} disabled={Boolean(exportando)} onClick={() => exportar("expediente")}>
              {exportando === "expediente" ? "Preparando el ZIP…" : "Exportar expediente (ZIP)"}
            </button>
            <button type="button" className={BOTON_SECUNDARIO} disabled={Boolean(exportando)} onClick={() => exportar("juicio")}>
              {exportando === "juicio" ? "Preparando…" : "Paquete para juicio"}
            </button>
          </div>
        ) : null}
        {data.puede_exportar ? <p className={SECUNDARIO}>El ZIP trae carpetas por etapa, un índice en PDF con la huella de cada archivo y queda en la bitácora. El paquete para juicio agrupa por lo que hay que probar (art. 784 LFT).</p> : null}
        <nav aria-label="Ir a una etapa" className="flex flex-wrap gap-3">
          {data.etapas.filter((e) => e.visible).map((e) => (
            <a key={e.clave} href={`#${e.clave}`} className={`${BOTON_SECUNDARIO} no-underline`}>{e.nombre}{pendientesEtapa(e) ? ` · ${pendientesEtapa(e)} pendientes` : ""}</a>
          ))}
        </nav>
      </Seccion>

      {data.etapas.map((etapa) => {
        if (!etapa.visible) {
          if (!data.puede_editar || !p.activo || !data.migracion) return null;
          return (
            <Seccion key={etapa.clave} id={etapa.clave} titulo="Salida" data-etapa={etapa.clave}>
              <p className={SECUNDARIO}>La salida aparece cuando hay baja o cuando la empiezas aquí (renuncia anunciada, despido, fin de contrato).</p>
              {salida === "confirmar" ? (
                <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); cambiarSalida(true); }} onKeyDown={(e) => { if (e.key === "Escape") setSalida(null); }}>
                  <label htmlFor="motivo-salida" className="font-bold">Motivo (opcional)</label>
                  <input id="motivo-salida" className={CAMPO} value={motivoSalida} maxLength={300} onChange={(e) => setMotivoSalida(e.target.value)} placeholder="Por ejemplo: renuncia anunciada" />
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className={BOTON_SECUNDARIO}>Sí, empezar la salida</button>
                    <button type="button" className={BOTON_SECUNDARIO} onClick={() => setSalida(null)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button type="button" className={`${BOTON_SECUNDARIO} w-fit`} onClick={() => setSalida("confirmar")}>Empezar la salida</button>
              )}
            </Seccion>
          );
        }
        const { llenas, vacias } = ordenarCarpetas(etapa.carpetas);
        const pendientes = pendientesEtapa(etapa);
        return (
          <Seccion key={etapa.clave} id={etapa.clave} titulo={etapa.nombre} data-etapa={etapa.clave}
            acciones={<Etiqueta tono={pendientes ? "rojo" : "verde"}>{pendientes ? `${pendientes} pendientes` : "Al corriente"}</Etiqueta>}>
            {etapa.clave === "salida" && data.salida && p.activo ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className={SECUNDARIO}>Salida iniciada por {data.salida.iniciada_por_nombre} el {fechaMx(data.salida.iniciada_en)}{data.salida.motivo ? `: ${data.salida.motivo}` : ""}.</p>
                {data.puede_editar ? <button type="button" className={BOTON_SECUNDARIO} onClick={() => cambiarSalida(false)}>Cancelar la salida</button> : null}
              </div>
            ) : null}
            <div className="grid gap-1">
              <h3 className="text-[19px] font-bold sm:text-lg">{etapa.clave === "relacion" ? "Lo que se revisa durante la relación" : "Pasos"}</h3>
              <ul className="grid" data-pasos={etapa.clave}>
                {etapa.pasos.map((item) => (
                  <PasoLey key={item.clave} item={item} puedeEditar={data.puede_editar && data.migracion !== false} onMarcar={marcar}
                    onSubir={(it, datos) => subir(it.clave, datos)} />
                ))}
              </ul>
            </div>
            <div className="grid gap-3">
              <h3 className="text-[19px] font-bold sm:text-lg">Carpetas</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {llenas.map((c) => <Carpeta key={c.clave} carpeta={c} puedeEditar={data.puede_editar} clavesSubir={clavesPorCarpeta[c.clave] ?? []} acciones={acciones} />)}
              </div>
              {vacias.length ? (
                <details className="rounded-xl border border-slate-300 p-4">
                  <summary className="flex min-h-12 cursor-pointer items-center font-bold">Carpetas vacías: {vacias.map((c) => c.nombre).join(", ")}</summary>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {vacias.map((c) => <Carpeta key={c.clave} carpeta={c} puedeEditar={data.puede_editar} clavesSubir={clavesPorCarpeta[c.clave] ?? []} acciones={acciones} />)}
                  </div>
                </details>
              ) : null}
            </div>
          </Seccion>
        );
      })}

      {data.puede_editar ? (
        <Seccion id="bitacora" titulo="Bitácora del expediente">
          {data.bitacora.length ? (
            <ul className="grid gap-2" data-bitacora>
              {data.bitacora.map((b, i) => (
                <li key={`${b.fecha}-${i}`} className="border-b border-slate-200 pb-2 last:border-b-0">
                  <span className="font-bold">{b.fecha ? `${fechaMx(b.fecha)} ${String(b.fecha).slice(11, 16)}` : ""}</span> · {b.accion_texto ?? b.accion}
                  {b.documento ? ` · ${b.documento}` : ""}{b.usuario ? <span className={SECUNDARIO}> · {b.usuario}</span> : null}
                </li>
              ))}
            </ul>
          ) : <p className={SECUNDARIO}>Sin movimientos todavía.</p>}
        </Seccion>
      ) : null}
    </div>
  );
}
