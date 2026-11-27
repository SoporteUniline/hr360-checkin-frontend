"use client";
// Invitación manual a un nuevo ingreso (maquetas 1 y 3). RH llena quién entra, cuándo y con quién; se ve qué plantilla le
// aplica (la más específica) y cómo le llega el WhatsApp. Al invitar, el servidor congela la plantilla, reparte las
// tareas y manda la invitación (WhatsApp; si no se puede, correo). La liga se muestra UNA vez para copiarla o mandarla
// por su propio WhatsApp; no se guarda en el navegador. Backend: POST /checador/induccion/procesos.
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Check, Copy, ExternalLink, MessageCircle, Send } from "lucide-react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API, textoAlcance, textoInvitacion } from "@/lib/induccion/induccion.mjs";
import { Campo, ariaCampo, botonPrimario, botonSecundario, camposDe, entrada, errorDe, get, opcionesSwr } from "./comun";

const VACIO = { nombre: "", apellido_paterno: "", apellido_materno: "", telefono: "", correo: "", puesto: "", departamento: "", sucursal: "", id_jefe: "", fecha_ingreso: "", hora_ingreso: "09:00" };

function validar(f) {
  const e = {};
  if (f.nombre.trim().length < 2) e.nombre = "Escribe el nombre.";
  const tel = f.telefono.replace(/\D/g, "");
  if (f.telefono.trim() && tel.length !== 10) e.telefono = "El celular tiene 10 dígitos.";
  if (f.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.correo.trim())) e.correo = "Correo inválido.";
  if (!tel && !f.correo.trim() && !e.telefono) e.telefono = "Escribe su celular (para WhatsApp) o su correo.";
  if (!f.fecha_ingreso) e.fecha_ingreso = "Elige el día de ingreso.";
  return e;
}

/** Vista previa del mensaje como lo ve la persona en WhatsApp (maqueta 3). */
export function VistaWhatsApp({ texto }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200" aria-label="Así le llega por WhatsApp" data-vista-whatsapp>
      <figcaption className="flex items-center gap-2 bg-[#075E54] px-3 py-2.5 text-white">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-white text-sm font-extrabold text-[#2563EB]">A</span>
        <span className="grid leading-tight"><b className="text-sm">ADAMIA</b><span className="text-[13px] opacity-80">Cuenta de empresa</span></span>
      </figcaption>
      <div className="grid gap-2 bg-[#ECE5DD] p-3">
        <p className="max-w-[92%] rounded-lg rounded-tl-none bg-white p-2.5 text-[13px] leading-relaxed text-slate-900 shadow-sm">{texto}</p>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-[#2563EB] shadow-sm"><ExternalLink className="size-4" aria-hidden="true" />Completar mi ingreso</span>
        <p className="text-[13px] text-slate-600">Si no lo completa en 2 días, ADAMIA le manda un recordatorio y avisa a RH.</p>
      </div>
    </figure>
  );
}

function Resultado({ r, nombre, alCerrar }) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => { try { await navigator.clipboard.writeText(r.liga); setCopiada(true); } catch { setCopiada(false); } };
  const textoWa = encodeURIComponent(`Hola ${nombre}, completa tu ingreso desde tu celular aquí: ${r.liga}`);
  const canal = { enviado: "Le llegó la invitación por WhatsApp.", respaldo: "WhatsApp aún no está disponible: le mandamos la invitación por correo.", fallido: "No se pudo enviar la invitación. Compártele la liga tú.", omitido: "No tiene WhatsApp ni correo válidos. Compártele la liga tú." }[r.envio?.estado] ?? "Invitación registrada.";
  return (
    <div className="grid gap-4" data-invitacion-lista>
      <DialogHeader>
        <DialogTitle>Invitación lista</DialogTitle>
        <DialogDescription>{canal}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="text-[13px] font-semibold text-slate-700">Liga personal de {nombre} (vence en 14 días)</span>
        <code className="break-all font-mono text-[13px] text-slate-800" data-liga>{r.liga}</code>
        <p className="text-[13px] text-slate-500">Solo se muestra ahora. Si la pierdes, usa «Reenviar» y se genera otra.</p>
      </div>
      <DialogFooter className="gap-2">
        <a href={`https://wa.me/?text=${textoWa}`} target="_blank" rel="noopener noreferrer" className={botonSecundario}><MessageCircle className="size-4" aria-hidden="true" />Mandar por mi WhatsApp</a>
        <button type="button" onClick={copiar} className={botonSecundario}>{copiada ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copiada ? "Copiada" : "Copiar liga"}</button>
        <button type="button" onClick={alCerrar} className={botonPrimario}>Listo</button>
      </DialogFooter>
    </div>
  );
}

export default function DialogoInvitar({ abierto, alCerrar, idEmpresa, nombreEmpresa, alInvitar }) {
  const [f, setF] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const catalogo = useSWR(abierto && idEmpresa ? `${API}/catalogo?empresa=${idEmpresa}` : null, get, opcionesSwr);
  const c = catalogo.data;
  const [clave, setClave] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setClave(`${f.puesto}|${f.departamento}|${f.sucursal}`), 350);
    return () => clearTimeout(t);
  }, [f.puesto, f.departamento, f.sucursal]);
  const [puesto, departamento, sucursal] = clave.split("|");
  const aplica = useSWR(abierto && idEmpresa ? `${API}/aplica?empresa=${idEmpresa}&puesto=${encodeURIComponent(puesto ?? "")}&departamento=${encodeURIComponent(departamento ?? "")}&sucursal=${encodeURIComponent(sucursal ?? "")}` : null, get, opcionesSwr);
  const texto = useMemo(() => textoInvitacion({ nombre: f.nombre.trim(), empresa: nombreEmpresa, puesto: f.puesto.trim(), fechaIngreso: f.fecha_ingreso, horaIngreso: f.hora_ingreso }), [f, nombreEmpresa]);

  const cambiar = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrores((x) => (x[k] ? { ...x, [k]: undefined } : x)); };
  const cerrar = () => { if (enviando) return; setF(VACIO); setErrores({}); setGeneral(""); setResultado(null); alCerrar(); };

  const enviar = async (e) => {
    e.preventDefault();
    const v = validar(f);
    setErrores(v);
    setGeneral("");
    if (Object.keys(v).length) return;
    setEnviando(true);
    try {
      const r = await axios.post(`${API}/procesos`, { empresa: idEmpresa, ...f, id_jefe: f.id_jefe ? Number(f.id_jefe) : null, hora_ingreso: f.hora_ingreso || null });
      setResultado(r.data);
      alInvitar?.();
    } catch (er) {
      const campos = camposDe(er);
      if (campos) setErrores(campos);
      setGeneral(errorDe(er, "No se pudo crear la invitación."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => { if (!a) cerrar(); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        {resultado ? <Resultado r={resultado} nombre={f.nombre.trim()} alCerrar={cerrar} /> : (
          <form onSubmit={enviar} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Invitar a un nuevo ingreso</DialogTitle>
              <DialogDescription>Le llega una liga para llenar sus datos, subir documentos y firmar desde su celular.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-[1fr_300px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo id="inv-nombre" etiqueta="Nombre" error={errores.nombre}><input {...ariaCampo("inv-nombre", errores.nombre)} className={entrada} value={f.nombre} onChange={cambiar("nombre")} maxLength={80} autoComplete="off" /></Campo>
                <Campo id="inv-ap" etiqueta="Apellido paterno" error={errores.apellido_paterno}><input {...ariaCampo("inv-ap", errores.apellido_paterno)} className={entrada} value={f.apellido_paterno} onChange={cambiar("apellido_paterno")} maxLength={80} autoComplete="off" /></Campo>
                <Campo id="inv-am" etiqueta="Apellido materno"><input id="inv-am" className={entrada} value={f.apellido_materno} onChange={cambiar("apellido_materno")} maxLength={80} autoComplete="off" /></Campo>
                <Campo id="inv-tel" etiqueta="Celular (WhatsApp)" error={errores.telefono}><input {...ariaCampo("inv-tel", errores.telefono)} className={entrada} value={f.telefono} onChange={cambiar("telefono")} inputMode="tel" autoComplete="off" placeholder="10 dígitos" /></Campo>
                <Campo id="inv-correo" etiqueta="Correo (respaldo)" error={errores.correo} className="sm:col-span-2"><input {...ariaCampo("inv-correo", errores.correo)} className={entrada} value={f.correo} onChange={cambiar("correo")} type="email" autoComplete="off" /></Campo>
                <Campo id="inv-puesto" etiqueta="Puesto"><input id="inv-puesto" list="inv-puestos" className={entrada} value={f.puesto} onChange={cambiar("puesto")} maxLength={150} /><datalist id="inv-puestos">{(c?.puestos ?? []).map((x) => <option key={x} value={x} />)}</datalist></Campo>
                <Campo id="inv-area" etiqueta="Área" error={errores.departamento}>
                  <select id="inv-area" className={entrada} value={f.departamento} onChange={cambiar("departamento")}><option value="">Sin área</option>{(c?.areas ?? []).map((x) => <option key={x}>{x}</option>)}</select>
                </Campo>
                <Campo id="inv-suc" etiqueta="Sucursal" error={errores.sucursal}>
                  <select id="inv-suc" className={entrada} value={f.sucursal} onChange={cambiar("sucursal")}><option value="">Sin sucursal</option>{(c?.sucursales ?? []).map((x) => <option key={x}>{x}</option>)}</select>
                </Campo>
                <Campo id="inv-jefe" etiqueta="Jefe directo" error={errores.id_jefe} ayuda="Recibe sus tareas «de jefe directo».">
                  <select {...ariaCampo("inv-jefe", errores.id_jefe)} className={entrada} value={f.id_jefe} onChange={cambiar("id_jefe")}><option value="">Sin jefe asignado</option>{(c?.personas ?? []).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select>
                </Campo>
                <Campo id="inv-fecha" etiqueta="Primer día" error={errores.fecha_ingreso}><input {...ariaCampo("inv-fecha", errores.fecha_ingreso)} type="date" className={entrada} value={f.fecha_ingreso} onChange={cambiar("fecha_ingreso")} /></Campo>
                <Campo id="inv-hora" etiqueta="Hora de entrada" error={errores.hora_ingreso}><input {...ariaCampo("inv-hora", errores.hora_ingreso)} type="time" className={entrada} value={f.hora_ingreso} onChange={cambiar("hora_ingreso")} /></Campo>
              </div>
              <div className="grid content-start gap-3">
                <p className="rounded-xl bg-blue-50 p-3 text-[13px] text-blue-900" role="status" data-plantilla-aplica>
                  {aplica.data?.plantilla ? <>Plantilla: <b>{aplica.data.plantilla.nombre}</b> · {textoAlcance(aplica.data.plantilla)}</> : aplica.data ? "Ninguna plantilla aplica: crea una general en Plantillas de inducción." : "Buscando la plantilla que aplica…"}
                </p>
                <VistaWhatsApp texto={texto} />
              </div>
            </div>
            {general ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{general}</p> : null}
            <DialogFooter className="gap-2">
              <button type="button" onClick={cerrar} className={botonSecundario}>Cancelar</button>
              <button type="submit" disabled={enviando || !aplica.data?.plantilla} className={botonPrimario}><Send className="size-4" aria-hidden="true" />{enviando ? "Enviando…" : "Enviar invitación"}</button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
