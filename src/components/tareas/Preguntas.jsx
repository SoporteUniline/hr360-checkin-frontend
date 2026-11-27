"use client";

// Campo de respuesta de una pregunta de checklist. El MISMO componente sirve para llenar en la app, para la
// vista previa al crear el checklist y para que el jefe corrija al revisar. Botones grandes (sin escribir) salvo en número
// y texto; «No aplica» si la pregunta lo permite; foto de evidencia donde se pide.
import { useState } from "react";
import { AlignLeft, Calendar, CalendarClock, Camera, CheckSquare, CircleDot, Hash, Image as ImageIcon, KeyRound, ListChecks, PenLine, Star, Type } from "lucide-react";
import FirmaGrande from "@/components/firma/FirmaGrande";
import { FotoSegura } from "./comun";
import { esCalificable, puntajePregunta } from "@/lib/tareas/preguntas.mjs";
import { TEXTO_PREPARANDO, usePrepararFoto } from "@/lib/imagenes/usePrepararFoto";

export const ICONOS = { si_no: CheckSquare, opcion: CircleDot, multiple: ListChecks, numero: Hash, foto: ImageIcon, estrellas: Star, texto: Type, texto_largo: AlignLeft, fecha: Calendar, fecha_hora: CalendarClock, firma: PenLine };

export function IconoTipo({ tipo, className = "size-4" }) {
  const Icono = ICONOS[tipo] ?? Type;
  return <Icono className={className} aria-hidden="true" />;
}

export function ChipPuntaje({ valor }) {
  if (valor == null) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">No cuenta</span>;
  const tono = valor >= 100 ? "bg-green-50 text-green-700" : valor > 0 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${tono}`}>{Math.round(valor * 10) / 10}%</span>;
}

function Chip({ activo, onClick, children, deshabilitado, tono = "azul", grande }) {
  const activos = { azul: "border-blue-600 bg-blue-600 text-white", verde: "border-green-600 bg-green-600 text-white", rojo: "border-red-600 bg-red-600 text-white", gris: "border-slate-700 bg-slate-700 text-white" };
  return (
    <button type="button" aria-pressed={activo} disabled={deshabilitado} onClick={onClick}
      className={`${grande ? "min-h-12 px-4 text-[15px]" : "min-h-10 px-3 text-[13.5px]"} rounded-xl border font-semibold disabled:opacity-60 ${activo ? activos[tono] : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>
      {children}
    </button>
  );
}

function SubirFoto({ url, alSubir, etiqueta, deshabilitado, subir }) {
  const [subiendo, setSubiendo] = useState(false);
  // (27/11/2026) La foto se convierte a WebP (1600 px, < 900 KB) al elegirla (lib/imagenes/aWeb.mjs); la vista previa es la convertida.
  const { preparando, preparar } = usePrepararFoto("evidencia");
  const [error, setError] = useState("");
  const elegir = async (elegida) => {
    if (!elegida) return;
    setError("");
    const foto = await preparar(elegida);
    if (foto.error) { setError(foto.error); return; }
    const archivo = foto.archivo;
    if (!subir) { alSubir(URL.createObjectURL(archivo)); return; }
    setSubiendo(true);
    const llave = await subir(archivo);
    setSubiendo(false);
    if (llave) alSubir(llave);
  };
  return (
    <span className="flex flex-wrap items-center gap-2">
      {url ? (/^(blob|data):/.test(url) ? <img src={url} alt="Foto de evidencia" className="size-14 rounded-lg object-cover" /> : <FotoSegura llave={url} className="size-14 rounded-lg object-cover" />) : null}
      {!deshabilitado ? (
        <label className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-amber-400 bg-amber-50 px-3 text-[13px] font-semibold text-amber-900 ${subiendo || preparando ? "opacity-60" : ""}`}>
          <Camera className="size-4" /> <span role={preparando ? "status" : undefined}>{preparando ? TEXTO_PREPARANDO : subiendo ? "Subiendo…" : url ? "Cambiar foto" : etiqueta}</span>
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={subiendo || preparando} onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      ) : null}
      {error ? <span role="alert" className="basis-full text-[13px] text-red-700">{error}</span> : null}
    </span>
  );
}

function Estrellas({ valor, onElegir, grande, deshabilitado, etiqueta }) {
  const n = Number(valor) || 0;
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={n === i} aria-label={`${i} ${i === 1 ? "estrella" : "estrellas"}`} disabled={deshabilitado} onClick={() => onElegir(i)}
          className={`grid ${grande ? "size-12" : "size-10"} place-items-center rounded-lg hover:bg-amber-50 disabled:opacity-60`}>
          <Star className={`${grande ? "size-8" : "size-6"} ${i <= n ? "fill-amber-400 text-amber-500" : "text-slate-300"}`} />
        </button>
      ))}
      {n ? <span className="ml-1 text-sm font-semibold text-slate-600">{n} de 5</span> : null}
    </div>
  );
}

// Firmar con el PIN de Mi espacio: el servidor verifica el PIN (con su candado de intentos) y estampa la
// firma guardada; aquí solo se pide el código. Los errores (PIN incorrecto, bloqueado) se muestran junto al campo.
function FirmaConPin({ firmaPin, onFirmar }) {
  const [abierto, setAbierto] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [firmando, setFirmando] = useState(false);
  const listo = /^\d{6}$/.test(pin);
  const firmar = async () => {
    if (!listo || firmando) return;
    setFirmando(true);
    setError("");
    const r = await firmaPin.firmar(pin);
    setFirmando(false);
    setPin("");
    if (r?.key) onFirmar(r.key);
    else setError(r?.error || "No se pudo firmar con tu PIN.");
  };
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[14px] font-semibold text-white">
        <KeyRound className="size-4" aria-hidden="true" /> Firmar con mi PIN
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <label className="block text-[13px] font-semibold text-slate-800">Tu PIN de 6 dígitos
        <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} autoFocus
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); firmar(); } }}
          className="mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-center text-lg tracking-[0.4em] tabular-nums" />
      </label>
      {error ? <p role="alert" className="text-[13px] font-semibold text-red-700">{error}</p> : null}
      <p className="text-[12px] text-slate-600">Se pondrá la firma que guardaste en Mi espacio.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setAbierto(false); setPin(""); setError(""); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold">Cancelar</button>
        <button type="button" disabled={!listo || firmando} onClick={firmar} className="min-h-11 flex-1 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white disabled:opacity-50">{firmando ? "Firmando…" : "Firmar"}</button>
      </div>
    </div>
  );
}

// Firma con el dedo: se dibuja y se confirma con «Listo»; queda la imagen y se puede volver a firmar.
function Firma({ valor, onFirmar, deshabilitado, etiqueta, subir, firmaPin = null }) {
  // Se dibuja con FirmaGrande: en celular a pantalla completa en horizontal; en computadora, aquí mismo.
  const firmar = async (png) => {
    if (!subir) { onFirmar(URL.createObjectURL(png)); return true; }
    // Si la subida falla, `subir` lanza el error y FirmaGrande lo muestra sin cerrar ni perder el trazo.
    const llave = await subir(png, { esFirma: true });
    if (!llave) throw new Error("No se pudo subir tu firma. Intenta de nuevo.");
    onFirmar(llave);
    return true;
  };
  if (valor) return (
    <span className="flex flex-wrap items-center gap-2">
      {valor.startsWith("blob:") ? <img src={valor} alt={`Firma: ${etiqueta}`} className="h-16 rounded-lg border border-slate-200 bg-white object-contain" /> : <FotoSegura llave={valor} alt={`Firma: ${etiqueta}`} className="h-16 rounded-lg border border-slate-200 bg-white object-contain" />}
      {!deshabilitado ? <button type="button" onClick={() => onFirmar(null)} className="min-h-10 rounded-lg px-2 text-[13px] font-semibold text-brand">Volver a firmar</button> : null}
    </span>
  );
  if (deshabilitado) return <span className="text-sm text-slate-500">Sin firma</span>;
  return (
    <div className="w-full max-w-md space-y-2">
      {firmaPin?.disponible ? <FirmaConPin firmaPin={firmaPin} onFirmar={onFirmar} /> : null}
      {firmaPin?.disponible ? <p className="text-[12.5px] text-slate-500">O dibuja tu firma:</p> : null}
      {/* El botón de dibujar no se llama igual que el del PIN («Firmar»): con PIN dice «Firmar dibujando». */}
      <FirmaGrande titulo={etiqueta} etiqueta={`Firma: ${etiqueta}`} textoBoton={firmaPin?.disponible ? "Firmar dibujando" : "Firmar"} textoGuardar="Listo, firmar" onGuardar={firmar} />
    </div>
  );
}

export function CampoRespuesta({ pregunta: p, respuesta, onChange, grande = false, deshabilitado = false, mostrarPuntaje = true, subir = null, firmaPin = null }) {
  const r = respuesta ?? {};
  const na = Boolean(r.na && p.permiteNA);
  const poner = (cambios) => onChange({ ...r, na: false, ...cambios });
  const puntaje = puntajePregunta(p, r);
  const contestada = na || (r.valor != null && r.valor !== "" && !(Array.isArray(r.valor) && !r.valor.length));
  return (
    <div className="space-y-2.5">
      {!na ? (
        <div className="flex flex-wrap gap-2">
          {p.tipo === "si_no" ? (
            <>
              <Chip grande={grande} deshabilitado={deshabilitado} activo={r.valor === "si"} tono={p.correcta === "no" ? "rojo" : "verde"} onClick={() => poner({ valor: "si" })}>Sí</Chip>
              <Chip grande={grande} deshabilitado={deshabilitado} activo={r.valor === "no"} tono={p.correcta === "no" ? "verde" : "rojo"} onClick={() => poner({ valor: "no" })}>No</Chip>
            </>
          ) : null}
          {p.tipo === "opcion" ? (p.opciones ?? []).map((o) => (
            <Chip key={o.id} grande={grande} deshabilitado={deshabilitado} activo={r.valor === o.id} tono="azul" onClick={() => poner({ valor: o.id })}>{o.texto}</Chip>
          )) : null}
          {p.tipo === "multiple" ? (p.opciones ?? []).map((o) => {
            const sel = Array.isArray(r.valor) && r.valor.includes(o.id);
            return (
              <Chip key={o.id} grande={grande} deshabilitado={deshabilitado} activo={sel} tono="azul"
                onClick={() => poner({ valor: sel ? r.valor.filter((x) => x !== o.id) : [...(Array.isArray(r.valor) ? r.valor : []), o.id] })}>
                {sel ? "✓ " : ""}{o.texto}
              </Chip>
            );
          }) : null}
          {p.tipo === "numero" ? (
            <label className="flex items-center gap-2">
              <span className="sr-only">{p.texto}</span>
              <input type="number" inputMode="decimal" disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value === "" ? null : Number(e.target.value) })}
                className={`${grande ? "h-12 w-36 text-lg" : "h-10 w-28 text-sm"} rounded-xl border border-slate-300 px-3 font-semibold tabular-nums`} />
              {p.unidad ? <span className="text-sm font-semibold text-slate-600">{p.unidad}</span> : null}
              {(p.min !== "" && p.min != null) || (p.max !== "" && p.max != null) ? <span className="text-[12px] text-slate-500">Bien: {p.min === p.max ? p.min : `${p.min ?? "…"} a ${p.max ?? "…"}`}</span> : null}
            </label>
          ) : null}
          {p.tipo === "foto" ? <SubirFoto url={r.valor} etiqueta="Tomar foto" deshabilitado={deshabilitado} subir={subir} alSubir={(url) => poner({ valor: url })} /> : null}
          {p.tipo === "estrellas" ? <Estrellas valor={r.valor} grande={grande} deshabilitado={deshabilitado} etiqueta={p.texto || "Calificación"} onElegir={(n) => poner({ valor: n })} /> : null}
          {p.tipo === "firma" ? <Firma valor={r.valor} deshabilitado={deshabilitado} subir={subir} firmaPin={firmaPin} etiqueta={p.texto || "Firma"} onFirmar={(url) => poner({ valor: url })} /> : null}
          {p.tipo === "texto" ? (
            <input aria-label={p.texto} disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value })} placeholder="Escribe aquí…"
              className={`${grande ? "h-12" : "h-10"} w-full rounded-xl border border-slate-300 px-3 text-base`} />
          ) : null}
          {p.tipo === "texto_largo" ? (
            <textarea aria-label={p.texto} rows={3} disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value })} placeholder="Escribe aquí…"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base" />
          ) : null}
          {p.tipo === "fecha" || p.tipo === "fecha_hora" ? (
            <input aria-label={p.texto} type={p.tipo === "fecha" ? "date" : "datetime-local"} disabled={deshabilitado} value={r.valor ?? ""} onChange={(e) => poner({ valor: e.target.value || null })}
              className={`${grande ? "h-12" : "h-10"} rounded-xl border border-slate-300 px-3 text-base`} />
          ) : null}
        </div>
      ) : <p className="text-sm font-semibold text-slate-500">No aplica: no cuenta en la calificación.</p>}

      <div className="flex flex-wrap items-center gap-2">
        {p.pideFoto && !na && p.tipo !== "foto" && contestada ? <SubirFoto url={r.foto} etiqueta="Foto de evidencia" deshabilitado={deshabilitado} subir={subir} alSubir={(url) => onChange({ ...r, foto: url })} /> : null}
        {p.permiteNA && !deshabilitado ? (
          <button type="button" aria-pressed={na} onClick={() => onChange(na ? { ...r, na: false } : { na: true })}
            className={`min-h-9 rounded-lg px-2.5 text-[12.5px] font-semibold ${na ? "bg-slate-700 text-white" : "text-slate-500 underline-offset-2 hover:underline"}`}>
            {na ? "Quitar «No aplica»" : "No aplica"}
          </button>
        ) : null}
        {mostrarPuntaje && contestada && esCalificable(p) ? <span className="ml-auto"><ChipPuntaje valor={puntaje} /></span> : null}
      </div>
    </div>
  );
}
