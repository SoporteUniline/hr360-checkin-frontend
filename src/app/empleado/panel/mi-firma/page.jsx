"use client";

// Mi espacio → Mi firma y PIN (22/11/2026, pedido del dueño). La persona dibuja y guarda su firma y crea un PIN secreto de
// 6 dígitos; con ese PIN firma sus documentos (se estampa la firma guardada). Puede cambiar ambos cuando quiera.
// El PIN nunca vuelve del servidor (solo se guarda su hash). Si lo olvidó, lo cambia con la contraseña de su cuenta.
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, KeyRound, PenLine } from "lucide-react";
import axios from "@/lib/axios";
import { cardClass, DataState } from "@/components/empleado/shared";
import FirmaGrande from "@/components/firma/FirmaGrande";
import { mensajeError } from "@/components/nomina/comun";
import { errorPin } from "@/lib/firma/pin.mjs";

const BASE = "/checador/mi-espacio";
const get = (url) => axios.get(url).then((r) => r.data);
const campo = "min-h-12 w-full rounded-xl border border-slate-300 px-3 text-center text-xl tracking-[0.4em]";
const fecha = (v) => (v ? new Date(`${String(v).replace(" ", "T")}Z`).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" }) : "");
const soloDigitos = (v) => v.replace(/\D/g, "").slice(0, 6);
function Aviso({ aviso }) {
  if (!aviso) return null;
  return <p role={aviso.ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm ${aviso.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{aviso.texto}</p>;
}

function SeccionFirma({ estado, alGuardar }) {
  const [editando, setEditando] = useState(!estado.tiene_firma);
  const [aviso, setAviso] = useState(null);
  const [imagen, setImagen] = useState(null);

  useEffect(() => {
    if (!estado.tiene_firma) return undefined;
    let url;
    let vivo = true;
    axios.get(`${BASE}/firma/imagen`, { responseType: "blob" }).then((r) => {
      if (!vivo) return;
      url = URL.createObjectURL(r.data);
      setImagen(url);
    }).catch(() => {});
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [estado.tiene_firma, estado.firma_actualizada_en]);

  // (23/11/2026) La firma se dibuja con FirmaGrande: en celular a pantalla completa en horizontal.
  const guardar = async (png) => {
    setAviso(null);
    try {
      const fd = new FormData();
      fd.append("firma", png, "firma.png");
      // La instancia manda JSON por defecto: sin esto el archivo se pierde (llegaba «{"firma":{}}»).
      await axios.put(`${BASE}/firma`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setEditando(false);
      setAviso({ ok: true, texto: "Listo, tu firma quedó guardada." });
      alGuardar();
      return true;
    } catch (e) {
      setAviso({ ok: false, texto: mensajeError(e, "No se pudo guardar tu firma.") });
      return false;
    }
  };

  return (
    <section className={cardClass} aria-labelledby="t-firma">
      <h2 id="t-firma" className="flex items-center gap-2 text-lg font-bold"><PenLine className="size-5 text-blue-600" />Mi firma</h2>
      {!editando ? (
        <>
          <p className="mt-1 text-sm text-slate-500">Guardada el {fecha(estado.firma_actualizada_en)}.</p>
          <div className="mt-3 grid h-36 place-items-center rounded-xl border border-slate-200 bg-white">
            {imagen ? <img src={imagen} alt="Tu firma guardada" className="max-h-32 max-w-full object-contain" /> : <span className="text-sm text-slate-400">Cargando tu firma…</span>}
          </div>
          <button type="button" onClick={() => { setEditando(true); setAviso(null); }} className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 font-semibold text-blue-700">Cambiar mi firma</button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">Dibújala como aparece en tus documentos. Se usará cuando firmes con tu PIN.</p>
          <div className="mt-3">
            <FirmaGrande titulo="Mi firma" textoBoton={estado.tiene_firma ? "Registrar nueva firma" : "Registrar firma"} textoGuardar="Guardar firma"
              onGuardar={guardar} onCancelar={estado.tiene_firma ? () => setEditando(false) : null} />
          </div>
        </>
      )}
      <div className="mt-3"><Aviso aviso={aviso} /></div>
    </section>
  );
}

function SeccionPin({ estado, alGuardar }) {
  const [abierto, setAbierto] = useState(!estado.tiene_pin);
  const [olvide, setOlvide] = useState(false);
  const [f, setF] = useState({ actual: "", contrasena: "", nuevo: "", repetir: "" });
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueado = estado.bloqueado_hasta && new Date(estado.bloqueado_hasta) > new Date();
  const problema = f.nuevo.length === 6 ? errorPin(f.nuevo) : null;
  const listo = !errorPin(f.nuevo) && f.nuevo === f.repetir && (!estado.tiene_pin || (olvide ? f.contrasena : f.actual.length === 6));

  const enviar = async (e) => {
    e.preventDefault();
    if (!listo) return;
    setOcupado(true);
    setAviso(null);
    try {
      await axios.put(`${BASE}/pin`, { nuevo: f.nuevo, ...(estado.tiene_pin ? (olvide ? { contrasena: f.contrasena } : { actual: f.actual }) : {}) });
      setF({ actual: "", contrasena: "", nuevo: "", repetir: "" });
      setAbierto(false);
      setOlvide(false);
      setAviso({ ok: true, texto: estado.tiene_pin ? "Listo, cambiaste tu PIN." : "Listo, tu PIN quedó creado. No lo compartas con nadie." });
      alGuardar();
    } catch (err) {
      setF((v) => ({ ...v, actual: "" }));
      setAviso({ ok: false, texto: mensajeError(err, "No se pudo guardar tu PIN.") });
      alGuardar();
    } finally {
      setOcupado(false);
    }
  };
  const pinInput = (k, etiqueta, auto) => (
    <label className="block text-sm font-medium">
      {etiqueta}
      <input type="password" inputMode="numeric" autoComplete={auto} value={f[k]} onChange={(e) => setF((v) => ({ ...v, [k]: soloDigitos(e.target.value) }))} className={`mt-1 ${campo}`} disabled={ocupado} />
    </label>
  );

  return (
    <section className={cardClass} aria-labelledby="t-pin">
      <h2 id="t-pin" className="flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-blue-600" />Mi PIN secreto</h2>
      <p className="mt-1 text-sm text-slate-500">
        {estado.tiene_pin ? `Creado o cambiado el ${fecha(estado.pin_actualizado_en)}. Nadie más lo conoce, ni Recursos Humanos.` : "Crea un PIN de 6 dígitos para firmar tus documentos sin dibujar cada vez."}
      </p>
      {bloqueado ? <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Tu PIN está bloqueado unos minutos por intentos fallidos. Si lo olvidaste, cámbialo con tu contraseña.</p> : null}
      {!abierto ? (
        <button type="button" onClick={() => { setAbierto(true); setAviso(null); }} className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 font-semibold text-blue-700">Cambiar mi PIN</button>
      ) : (
        <form onSubmit={enviar} className="mt-3 space-y-3">
          {estado.tiene_pin ? (
            olvide ? (
              <label className="block text-sm font-medium">
                Contraseña de tu cuenta
                <input type="password" autoComplete="current-password" value={f.contrasena} onChange={(e) => setF((v) => ({ ...v, contrasena: e.target.value }))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" disabled={ocupado} />
              </label>
            ) : pinInput("actual", "PIN actual", "off")
          ) : null}
          {estado.tiene_pin ? (
            <button type="button" onClick={() => setOlvide((v) => !v)} className="min-h-11 text-sm font-semibold text-blue-700">{olvide ? "Mejor uso mi PIN actual" : "Olvidé mi PIN"}</button>
          ) : null}
          {pinInput("nuevo", "Nuevo PIN (6 dígitos)", "new-password")}
          {problema ? <p className="text-sm text-red-700">{problema}</p> : null}
          {pinInput("repetir", "Escríbelo otra vez", "new-password")}
          {f.repetir.length === 6 && f.repetir !== f.nuevo ? <p className="text-sm text-red-700">Los dos PIN no coinciden.</p> : null}
          <div className="grid grid-cols-2 gap-2">
            {estado.tiene_pin ? <button type="button" onClick={() => { setAbierto(false); setOlvide(false); setF({ actual: "", contrasena: "", nuevo: "", repetir: "" }); }} className="min-h-11 rounded-xl border border-slate-300 font-medium" disabled={ocupado}>Cancelar</button> : <span />}
            <button type="submit" disabled={!listo || ocupado} className="min-h-11 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50">{ocupado ? "Guardando…" : estado.tiene_pin ? "Cambiar PIN" : "Crear PIN"}</button>
          </div>
        </form>
      )}
      <div className="mt-3"><Aviso aviso={aviso} /></div>
    </section>
  );
}

export default function MiFirma() {
  const { data, error, isLoading, mutate } = useSWR(`${BASE}/firma`, get);
  return (
    <div className="space-y-5">
      <Link href="/empleado/panel/mi-espacio" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600"><ArrowLeft className="size-4" />Mi espacio</Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi firma y PIN</h1>
        <p className="mt-1 text-sm text-slate-500">Con tu firma guardada y tu PIN firmas tus documentos en un paso.</p>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{mensajeError(error, "No pudimos consultar tu firma.")} <button onClick={() => mutate()} className="font-semibold text-blue-700">Reintentar</button></p> : (
        <DataState loading={isLoading}>
          {data ? (
            <>
              <SeccionFirma estado={data} alGuardar={mutate} />
              <SeccionPin estado={data} alGuardar={mutate} />
              {data.tiene_firma && data.tiene_pin ? <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Listo: cuando te llegue un documento para firmar, elige «Firmar con mi PIN».</p> : null}
            </>
          ) : null}
        </DataState>
      )}
    </div>
  );
}
