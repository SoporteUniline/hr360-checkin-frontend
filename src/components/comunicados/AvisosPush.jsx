"use client";
// Notificaciones push del muro (Web Push con VAPID). Solo se muestra si el servidor tiene push configurado
// (GET /mi/push/clave → { habilitado, vapid_public_key }) y el navegador lo soporta. En la app nativa (Capacitor) el push
// llega en R2 con Firebase: aquí no se ofrece. El service worker tiene alcance propio (/comunicados-push/) para no tocar
// el de «/» (offline-clock-sw.js, que se retira solo; ver RetireOfflineWorker).
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Capacitor } from "@capacitor/core";
import { Bell, BellOff } from "lucide-react";
import axios from "@/lib/axios";
import { API_MI, PUSH_ALCANCE, PUSH_SW, claveVapid, errorDe } from "@/lib/comunicados/comunicados.mjs";
import { botonPrimario, botonSecundario, get, opcionesSwr } from "./comun";

function soportado() {
  try {
    if (Capacitor.isNativePlatform() || navigator.userAgent.includes("AdamiaAppNative")) return false;
    return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  } catch { return false; }
}

async function activo(registro) {
  const w = registro.installing || registro.waiting || registro.active;
  if (!w || w.state === "activated") return registro;
  await new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error("El navegador tardó en preparar las notificaciones.")), 20000);
    const cambio = () => {
      if (w.state === "activated") { clearTimeout(t); w.removeEventListener("statechange", cambio); resolver(); }
      if (w.state === "redundant") { clearTimeout(t); w.removeEventListener("statechange", cambio); rechazar(new Error("No se pudo preparar el navegador.")); }
    };
    w.addEventListener("statechange", cambio);
  });
  return registro;
}

export default function AvisosPush() {
  const [puede, setPuede] = useState(false);
  useEffect(() => { setPuede(soportado()); }, []);
  const { data } = useSWR(puede ? `${API_MI}/push/clave` : null, get, opcionesSwr);
  const [suscrito, setSuscrito] = useState(null);
  const [permiso, setPermiso] = useState("default");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const revisar = useCallback(async () => {
    try {
      setPermiso(Notification.permission);
      const r = await navigator.serviceWorker.getRegistration(PUSH_ALCANCE);
      const s = r ? await r.pushManager.getSubscription() : null;
      setSuscrito(Boolean(s));
    } catch { setSuscrito(false); }
  }, []);
  useEffect(() => { if (puede && data?.habilitado) revisar(); }, [puede, data, revisar]);

  if (!puede || !data?.habilitado || !data?.vapid_public_key || suscrito === null) return null;

  const activar = async () => {
    setOcupado(true); setMensaje(null);
    try {
      const p = await Notification.requestPermission();
      setPermiso(p);
      if (p !== "granted") { setMensaje("No diste permiso. Puedes activarlo después en los ajustes de tu navegador."); return; }
      const registro = await activo(await navigator.serviceWorker.register(PUSH_SW, { scope: PUSH_ALCANCE }));
      const s = (await registro.pushManager.getSubscription()) ?? await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveVapid(data.vapid_public_key) });
      const json = s.toJSON();
      await axios.post(`${API_MI}/push/suscribir`, { subscription: json, endpoint: json.endpoint, keys: json.keys });
      setSuscrito(true);
      setMensaje("Listo: te avisaremos aquí de los comunicados nuevos.");
    } catch (e) { setMensaje(errorDe(e, e?.message || "No se pudieron activar las notificaciones.")); }
    finally { setOcupado(false); }
  };
  const desactivar = async () => {
    setOcupado(true); setMensaje(null);
    try {
      const r = await navigator.serviceWorker.getRegistration(PUSH_ALCANCE);
      const s = r ? await r.pushManager.getSubscription() : null;
      if (s) { await axios.post(`${API_MI}/push/desuscribir`, { endpoint: s.endpoint }).catch(() => {}); await s.unsubscribe(); }
      setSuscrito(false);
      setMensaje("Ya no recibirás notificaciones en este navegador.");
    } catch (e) { setMensaje(errorDe(e)); }
    finally { setOcupado(false); }
  };

  return (
    <section aria-labelledby="push-titulo" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center" data-push={suscrito ? "activo" : "inactivo"}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">{suscrito ? <Bell className="size-5" aria-hidden="true" /> : <BellOff className="size-5" aria-hidden="true" />}</span>
      <div className="min-w-0 flex-1">
        <h2 id="push-titulo" className="text-[15px] font-bold text-slate-900">{suscrito ? "Notificaciones activadas" : "Recibe avisos en este teléfono"}</h2>
        <p className="text-[13px] text-slate-600" aria-live="polite">{mensaje ?? (permiso === "denied" ? "Las notificaciones están bloqueadas en este navegador: actívalas en sus ajustes." : suscrito ? "Te avisamos de comunicados nuevos y recordatorios." : "Te avisamos cuando RH publique algo para ti.")}</p>
      </div>
      {suscrito
        ? <button type="button" className={botonSecundario} disabled={ocupado} onClick={desactivar}>Desactivar</button>
        : permiso !== "denied" ? <button type="button" className={botonPrimario} disabled={ocupado} onClick={activar}>{ocupado ? "Activando…" : "Activar notificaciones"}</button> : null}
    </section>
  );
}
