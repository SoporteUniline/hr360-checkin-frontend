"use client";

// Mantiene Asistencias y el Monitor al día sin recargar (docs/asistencias/refresco.md). Lo comparten las dos pantallas
// para no abrir dos conexiones distintas: UNA conexión SSE por pantalla.
// - SSE del backend (GET /checador/reloj/eventos-checada): «checada» (alguien checó) y «asistencia» (alguien editó un día,
//   corrigió una checada, aprobó un permiso, guardó horas extra…, en otra pestaña o con otro usuario). Con «Todas las
//   empresas» se suscribe a las empresas del usuario («7,8»): el backend no emite a «empresa:all».
// - Cola sin conexión ('adamia-queue'): subió checadas guardadas sin red.
// - Respaldo si el SSE se cae (proxies): al volver a la pestaña y un sondeo cada minuto, solo a la vista y solo si el
//   canal no ha dado señales (el backend manda «ping» cada 30 s).
// Todo pasa por el refrescador único (lib/asistencia/refrescoAsistencias.js): revalida todas las claves que dependen de
// las asistencias, junta ráfagas y no recarga mientras hay una edición con cambios sin guardar.
import { useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import { empresasDelCanal, tocaAlVolver, tocaSondeo, TIEMPOS } from "@/lib/asistencia/refresco.mjs";
import { refrescador } from "@/lib/asistencia/refrescoAsistencias";

const INTERVALO_AVISO_MS = 8000; // máx. un aviso cada 8 s para no saturar en horas pico de entrada
const SONDEO_REVISION_MS = 15000; // cada cuánto se revisa si toca el sondeo (el sondeo mismo es de TIEMPOS.sondeo)

// El segundo argumento (mutate de la tabla) ya no hace falta: se recarga todo lo de asistencias. Se acepta para no
// romper a quien lo pase.
export default function useRefrescoChecadas(idEmpresa, _mutate, { avisar = true } = {}) {
  const { dataUser } = useAuth();
  const canal = empresasDelCanal(idEmpresa, dataUser?.empresas);
  const { enqueueSnackbar } = useSnackbar();
  const ultimoAviso = useRef(0);
  const ultimoPing = useRef(null);

  useEffect(() => {
    // Preparar el reloj ('perfil') no cambia datos y provocaría una segunda descarga completa del periodo.
    const refresh = (event) => {
      if (event?.detail?.motivo === "perfil") return;
      if (navigator.onLine && window.__adamiaOffline !== true) refrescador.avisar("cola");
    };
    window.addEventListener("adamia-queue", refresh);
    return () => window.removeEventListener("adamia-queue", refresh);
  }, []);

  useEffect(() => {
    if (!canal) return undefined;
    ultimoPing.current = null;
    const es = new EventSource(`${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/eventos-checada?id_empresa=${canal}`);
    const aviso = (texto, variant) => {
      const ahora = Date.now();
      if (!avisar || ahora - ultimoAviso.current <= INTERVALO_AVISO_MS) return;
      ultimoAviso.current = ahora;
      enqueueSnackbar(texto, { variant, autoHideDuration: 3500 });
    };
    const vivo = () => { ultimoPing.current = Date.now(); };
    es.addEventListener("ping", vivo);
    es.addEventListener("checada", () => {
      vivo();
      // Con la pestaña oculta o una edición abierta queda pendiente: no se dice «actualizados» si aún no lo están.
      if (refrescador.avisar("checada") !== "pendiente") aviso("Nueva checada recibida — registros actualizados", "success");
    });
    es.addEventListener("asistencia", () => {
      vivo();
      const r = refrescador.avisar("asistencia");
      // Aviso discreto, y no después de un guardado propio (es su eco) ni si quedó pendiente por una edición abierta.
      if (r === "programado" && !refrescador.esEco()) aviso("Asistencias actualizadas", "info");
    });
    es.onerror = () => {};
    return () => es.close();
  }, [canal, avisar, enqueueSnackbar]);

  // Respaldo: volver a la pestaña y sondeo ligero mientras se ve.
  useEffect(() => {
    if (!canal) return undefined;
    const montado = Date.now();
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") return;
      const ahora = Date.now();
      if (tocaAlVolver({ ahora, pendiente: refrescador.hayPendiente(), ultimoPing: ultimoPing.current,
        ultimoRefresco: refrescador.ultimoRefresco() })) refrescador.avisar("foco");
    };
    const revisar = () => {
      const ahora = Date.now();
      if (tocaSondeo({ ahora, visible: document.visibilityState !== "hidden", editando: window.__adamiaCambiosPendientes === true,
        ultimoPing: ultimoPing.current, ultimoRefresco: refrescador.ultimoRefresco() ?? montado })) refrescador.avisar("sondeo");
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    const t = setInterval(revisar, Math.min(SONDEO_REVISION_MS, TIEMPOS.sondeo));
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      clearInterval(t);
    };
  }, [canal]);
}
