"use client";

// Datos del módulo Tareas y Checklists (23/11/2026): conectado a la API /checador/tareas (antes, datos de ejemplo).
// Dos modos: «panel» (RH / dueño, por empresa) y «empleado» (su app). Las pantallas usan la forma del prototipo
// (lib/tareas/api.mjs traduce). Mover tarjetas y palomear pasos se ven al instante y luego se confirman con el servidor;
// cualquier error se avisa y se recarga lo último.
import { createContext, useCallback, useContext, useMemo } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { aChecklistApi, aProyectoApi, aRespuestasApi, aTareaApi, deChecklistApi, dePersonaApi, deProyectoApi, deTareaApi } from "@/lib/tareas/api.mjs";
import { comprimirImagen } from "@/lib/tareas/imagen.mjs";

const BASE = "/checador/tareas";
const Contexto = createContext(null);
const get = (url) => axios.get(url).then((r) => r.data);
export const errorDe = (e, porDefecto = "No se pudo completar. Intenta de nuevo.") => e?.response?.data?.error || porDefecto;
const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const archivo = (blob, nombre = "foto.jpg") => { const fd = new FormData(); fd.append("foto", blob, nombre); return fd; };
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

function usePanel(idEmpresa) {
  const modulo = useSWR(idEmpresa ? `${BASE}/modulo?empresa=${idEmpresa}` : null, get, { shouldRetryOnError: false });
  const activo = modulo.data?.activo === true;
  const panel = useSWR(idEmpresa && activo ? `${BASE}/panel?empresa=${idEmpresa}` : null, get, { shouldRetryOnError: false, revalidateOnFocus: true });
  const hoy = panel.data?.hoy ?? hoyMx();
  const enviosHoy = useSWR(idEmpresa && activo ? `${BASE}/envios?empresa=${idEmpresa}&desde=${hoy}&hasta=${hoy}` : null, get, { shouldRetryOnError: false });
  return { modulo, panel, enviosHoy, hoy };
}

export function TareasProvider({ modo = "panel", idEmpresa = null, children }) {
  const { enqueueSnackbar } = useSnackbar();
  const esPanel = modo === "panel";
  const p = usePanel(esPanel ? idEmpresa : null);
  const misTareas = useSWR(!esPanel ? `${BASE}/mis-tareas` : null, get, { shouldRetryOnError: false });
  const misChecklists = useSWR(!esPanel ? `${BASE}/mis-checklists` : null, get, { shouldRetryOnError: false });

  const fuente = esPanel ? p.panel : misTareas;
  const datos = fuente.data;
  const tareas = useMemo(() => (datos?.tareas ?? []).map(deTareaApi), [datos]);
  const proyectos = useMemo(() => (datos?.proyectos ?? []).map(deProyectoApi), [datos]);
  const personas = useMemo(() => (datos?.personas ?? []).map(dePersonaApi), [datos]);
  const checklists = useMemo(() => (datos?.checklists ?? []).map(deChecklistApi), [datos]);

  const recargar = useCallback(() => { if (esPanel) { p.panel.mutate(); p.enviosHoy.mutate(); } else { misTareas.mutate(); misChecklists.mutate(); } }, [esPanel, p.panel, p.enviosHoy, misTareas, misChecklists]);
  // Ejecuta una acción: avisa el error del servidor y recarga; devuelve { ok, data } o { ok: false, error }.
  const ejecutar = useCallback(async (fn, { exito, recargarDespues = true } = {}) => {
    try {
      const r = await fn();
      if (exito) enqueueSnackbar(exito, { variant: "success" });
      return { ok: true, data: r?.data };
    } catch (e) {
      const error = errorDe(e);
      enqueueSnackbar(error, { variant: "error" });
      return { ok: false, error, codigo: e?.response?.data?.codigo, problemas: e?.response?.data?.problemas };
    } finally {
      if (recargarDespues) recargar();
    }
  }, [enqueueSnackbar, recargar]);

  // Cambio instantáneo en pantalla de una tarea (sin esperar al servidor).
  const cambiarLocal = useCallback((id, cambio) => {
    fuente.mutate((d) => (d ? { ...d, tareas: d.tareas.map((t) => (t.id === id ? cambio(t) : t)) } : d), { revalidate: false });
  }, [fuente]);

  const acciones = useMemo(() => ({
    moverTarea: (t, estado) => { cambiarLocal(t.id, (x) => ({ ...x, estado })); return ejecutar(() => axios.post(`${BASE}/tareas/${t.id}/mover`, { estado, version: t.version })); },
    marcarPaso: (t, paso, hecho) => {
      cambiarLocal(t.id, (x) => ({ ...x, estado: hecho && x.estado === "por_hacer" ? "en_proceso" : x.estado, pasos: x.pasos.map((s) => (s.id === paso.id ? { ...s, hecho } : s)) }));
      return ejecutar(() => axios.post(`${BASE}/tareas/${t.id}/pasos/${paso.id}`, { hecho }));
    },
    comentar: (t, texto) => ejecutar(() => axios.post(`${BASE}/tareas/${t.id}/comentarios`, { texto })),
    subirFotoTarea: async (t, file) => ejecutar(async () => axios.post(`${BASE}/tareas/${t.id}/fotos`, archivo(await comprimirImagen(file)), multipart), { exito: "Foto guardada." }),
    guardarTarea: (t) => ejecutar(() => (t.id ? axios.put(`${BASE}/tareas/${t.id}`, aTareaApi(t, idEmpresa)) : axios.post(`${BASE}/tareas`, aTareaApi(t, idEmpresa))), { exito: t.id ? "Cambios guardados." : "Tarea creada y asignada." }),
    archivarTarea: (t) => ejecutar(() => axios.put(`${BASE}/tareas/${t.id}`, { archivar: true }), { exito: "Tarea archivada." }),
    guardarProyecto: (pr) => ejecutar(() => (pr.id ? axios.put(`${BASE}/proyectos/${pr.id}`, aProyectoApi(pr, idEmpresa)) : axios.post(`${BASE}/proyectos`, aProyectoApi(pr, idEmpresa))), { exito: pr.id ? "Proyecto guardado." : "Proyecto creado." }),
    guardarChecklist: (f) => ejecutar(() => (f.id ? axios.put(`${BASE}/checklists/${f.id}`, aChecklistApi(f, idEmpresa)) : axios.post(`${BASE}/checklists`, aChecklistApi(f, idEmpresa)))),
    archivarChecklist: (c) => ejecutar(() => axios.put(`${BASE}/checklists/${c.id}`, { archivar: true }), { exito: "Checklist archivado." }),
    revisarEnvio: (envio, { aprobar, comentario, correcciones }) => ejecutar(() => axios.post(`${BASE}/envios/${envio.id}/revisar`, { aprobar, comentario, correcciones: aRespuestasApi(correcciones), version: envio.version })),
    // Empleado: sube la foto o firma de una respuesta (comprimida) y devuelve su llave.
    subirArchivoEnvio: async (idEnvio, blob, { esFirma = false } = {}) => {
      try {
        const fd = new FormData();
        fd.append("archivo", esFirma ? blob : await comprimirImagen(blob), esFirma ? "firma.png" : "foto.jpg");
        const r = await axios.post(`${BASE}/envios/${idEnvio}/archivo`, fd, multipart);
        return r.data.key;
      } catch (e) {
        // La firma muestra su error dentro de FirmaGrande (encima de la pantalla completa), no como aviso flotante.
        if (esFirma) throw new Error(errorDe(e, "No se pudo subir tu firma. Intenta de nuevo."));
        enqueueSnackbar(errorDe(e, "No se pudo subir la imagen."), { variant: "error" });
        return null;
      }
    },
    // (23/11/2026) Pregunta «Firma» con el PIN: el servidor estampa la firma guardada. → { key } o { error } (se muestra
    // junto al campo del PIN, no como aviso flotante).
    firmarConPinEnvio: async (idEnvio, pin) => {
      try {
        const r = await axios.post(`${BASE}/envios/${idEnvio}/firma-pin`, { pin });
        return { key: r.data.key };
      } catch (e) {
        return { error: errorDe(e, "No se pudo firmar con tu PIN. Intenta de nuevo.") };
      }
    },
    enviarChecklist: (idEnvio, respuestas, nota) => ejecutar(() => axios.post(`${BASE}/envios/${idEnvio}/enviar`, { respuestas: aRespuestasApi(respuestas), nota })),
  }), [ejecutar, cambiarLocal, idEmpresa, enqueueSnackbar]);

  const valor = useMemo(() => ({
    modo, idEmpresa, hoy: datos?.hoy ?? misChecklists.data?.hoy ?? p.hoy,
    cargando: esPanel ? (p.modulo.isLoading || (p.modulo.data?.activo && p.panel.isLoading)) : misTareas.isLoading || misChecklists.isLoading,
    error: esPanel ? p.modulo.error || p.panel.error : misTareas.error || misChecklists.error,
    modulo: esPanel ? { activo: p.modulo.data?.activo ?? null, puedeActivar: p.modulo.data?.derecho ?? Boolean(p.modulo.data?.puede_activar) } : { activo: true },
    activarModulo: () => ejecutar(() => axios.post(`${BASE}/modulo`, { empresa: idEmpresa }), { exito: "Listo, el módulo de Tareas quedó activo." }).then((r) => { p.modulo.mutate(); return r; }),
    tareas, proyectos, personas, checklists,
    puestos: datos?.puestos ?? [], sucursales: datos?.sucursales ?? [], departamentos: datos?.departamentos ?? [],
    enviosHoy: p.enviosHoy.data?.envios ?? [],
    misChecklists: misChecklists.data?.checklists ?? [],
    persona: (id) => personas.find((x) => x.id === Number(id)) ?? null,
    proyecto: (id) => proyectos.find((x) => x.id === Number(id)) ?? null,
    checklist: (id) => checklists.find((x) => x.id === Number(id)) ?? null,
    recargar, ...acciones,
  }), [modo, idEmpresa, datos, misChecklists, p, esPanel, misTareas, ejecutar, tareas, proyectos, personas, checklists, recargar, acciones]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTareas() {
  const v = useContext(Contexto);
  if (!v) throw new Error("useTareas fuera de TareasProvider");
  return v;
}
