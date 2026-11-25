"use client";

// Adamia AI en el panel. Botón en el encabezado que abre un panel lateral con el agente de la
// Ley Federal del Trabajo para la empresa: solo RH y dueño (a un empleado no le aparece). Responde con el texto oficial
// de la LFT guardado en el sistema y cita los artículos. El dueño la enciende y pone el tope de gasto del mes.
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { BookOpenText, History, Loader2, Plus, Send, Sparkles } from "lucide-react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import TextoIA from "./TextoIA";
import Link from "next/link";
import IndicadorCreditos from "./IndicadorCreditos";
import { RUTA_CREDITOS } from "@/lib/ia/creditos.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const errorDe = (e, d) => e?.response?.data?.error || d;
const SUGERENCIAS = [
  "¿Cuántos días de vacaciones le tocan a alguien con 3 años?",
  "¿Cómo calculo el aguinaldo de alguien que entró en julio y gana $9,000 al mes?",
  "¿Qué le debo pagar si despido sin causa a alguien con 2 años y $300 diarios?",
  "¿Cuánto se paga la hora extra después de las 9 horas a la semana?",
];
const fechaDOF = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "");

function Articulos({ articulos }) {
  if (!articulos?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {articulos.map((a) => (
        <details key={a.numero} className="group w-full rounded-lg border border-slate-200 bg-white text-[12.5px] open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 font-semibold text-brand">
            <BookOpenText className="size-3.5" /> Art. {a.numero} LFT
            <span className="truncate font-normal text-slate-500">{a.capitulo ? `· ${a.capitulo.replace(/^CAP[IÍ]TULO [IVXLC]+ · /i, "")}` : ""}</span>
          </summary>
          <p className="max-h-56 overflow-auto whitespace-pre-line border-t border-slate-100 px-2.5 py-2 text-slate-700">{a.texto}</p>
        </details>
      ))}
    </div>
  );
}

function Activar({ estado, idEmpresa, alCambiar }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const activar = async () => {
    setGuardando(true); setError("");
    try { await axios.put("/checador/ia/ajustes", { empresa: idEmpresa, activo: true }); await alCambiar(); } catch (e) { setError(errorDe(e, "No se pudo activar.")); } finally { setGuardando(false); }
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
      <p className="text-base font-bold text-[#080d36]">Adamia AI no está activa en esta empresa</p>
      <p className="mt-1">Pregúntale lo que necesites de la Ley Federal del Trabajo: vacaciones, aguinaldo, finiquitos, horas extra, despidos. Responde con el texto oficial y te dice el artículo.</p>
      <p className="mt-2 text-[12.5px] text-slate-500">{estado.creditos?.cobro_activo ? "Se paga con créditos prepagados en pesos." : `Tope de uso inicial: ${estado.tope_mensual_usd} USD al mes (se puede cambiar).`} Solo la usan RH y el dueño.</p>
      {error ? <p role="alert" className="mt-2 text-red-700">{error}</p> : null}
      {estado.puede_activar ? (
        <button type="button" onClick={activar} disabled={guardando} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-4 font-semibold text-white disabled:opacity-60">
          {guardando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Activar Adamia AI
        </button>
      ) : <p className="mt-3 font-semibold text-slate-700">Pídele al dueño de la cuenta que la active.</p>}
    </div>
  );
}

function Tope({ estado, idEmpresa, alCambiar }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(estado.tope_mensual_usd));
  const [error, setError] = useState("");
  const guardar = async (cambios) => {
    setError("");
    try { await axios.put("/checador/ia/ajustes", { empresa: idEmpresa, ...cambios }); setEditando(false); await alCambiar(); } catch (e) { setError(errorDe(e, "No se pudo guardar.")); }
  };
  // (25/11/2026) Créditos: se muestra el saldo en pesos (nunca el costo). Con el cobro encendido el tope en USD ya no aplica.
  const creditos = estado.creditos?.disponible ? estado.creditos : null;
  const conTope = !creditos?.cobro_activo;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
      {creditos ? <IndicadorCreditos creditos={creditos} className="w-full" /> : null}
      {creditos ? (conTope ? <span>Tope del mes: ${Number(estado.tope_mensual_usd).toFixed(2)} USD</span> : null)
        : <span>Uso este mes: ${Number(estado.gasto_mes_usd).toFixed(2)} de ${Number(estado.tope_mensual_usd).toFixed(2)} USD</span>}
      {estado.puede_activar ? (
        editando && conTope ? (
          <span className="flex items-center gap-1">
            <input aria-label="Tope mensual en dólares" type="number" min="1" max="500" value={valor} onChange={(e) => setValor(e.target.value)} className="h-7 w-20 rounded border border-slate-300 px-1.5" />
            <button type="button" className="font-semibold text-brand" onClick={() => guardar({ tope_mensual_usd: Number(valor) })}>Guardar</button>
          </span>
        ) : (
          <>
            {conTope ? <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={() => setEditando(true)}>Cambiar tope</button> : null}
            <button type="button" className="font-semibold text-slate-500 underline-offset-2 hover:underline" onClick={() => guardar({ activo: false })}>Apagar</button>
          </>
        )
      ) : null}
      {error ? <span role="alert" className="text-red-700">{error}</span> : null}
    </div>
  );
}

function Chat({ idEmpresa, estado, alCambiar }) {
  const [mensajes, setMensajes] = useState([]);
  const [idConversacion, setIdConversacion] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [verHistorial, setVerHistorial] = useState(false);
  const [sinCreditos, setSinCreditos] = useState(false);
  const fin = useRef(null);
  const historial = useSWR(verHistorial ? `/checador/ia/lft/conversaciones?empresa=${idEmpresa}` : null, get);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [mensajes, enviando]);

  const preguntar = async (pregunta) => {
    const p = pregunta.trim();
    if (p.length < 3 || enviando) return;
    setError(""); setSinCreditos(false); setTexto(""); setEnviando(true);
    setMensajes((m) => [...m, { rol: "usuario", texto: p }]);
    try {
      const { data } = await axios.post("/checador/ia/lft/preguntar", { empresa: idEmpresa, pregunta: p, id_conversacion: idConversacion }, { timeout: 60000 });
      setIdConversacion(data.id_conversacion);
      setMensajes((m) => [...m, { rol: "asistente", texto: data.respuesta, articulos: data.articulos }]);
      alCambiar();
    } catch (e) {
      setError(errorDe(e, "No se pudo responder. Intenta de nuevo."));
      setSinCreditos(e?.response?.data?.codigo === "IA_SIN_CREDITOS");
      setMensajes((m) => m.slice(0, -1));
      setTexto(p);
    } finally { setEnviando(false); }
  };
  const abrir = async (id) => {
    const { data } = await axios.get(`/checador/ia/lft/conversaciones/${id}?empresa=${idEmpresa}`);
    setMensajes(data.mensajes); setIdConversacion(id); setVerHistorial(false);
  };
  const nueva = () => { setMensajes([]); setIdConversacion(null); setVerHistorial(false); setError(""); };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
        <button type="button" onClick={nueva} className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"><Plus className="size-3.5" /> Nueva</button>
        <button type="button" onClick={() => setVerHistorial((v) => !v)} aria-expanded={verHistorial} className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"><History className="size-3.5" /> Historial</button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
        {verHistorial ? (
          <div className="space-y-1">
            {historial.isLoading ? <p className="text-sm text-slate-500">Cargando…</p> : null}
            {historial.data?.conversaciones?.length === 0 ? <p className="text-sm text-slate-500">Aún no tienes preguntas guardadas.</p> : null}
            {historial.data?.conversaciones?.map((c) => (
              <button key={c.id} type="button" onClick={() => abrir(c.id)} className="block w-full truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-brand">{c.titulo}</button>
            ))}
          </div>
        ) : mensajes.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Pregunta lo que necesites de la Ley Federal del Trabajo. Te respondo con el texto oficial y el artículo.</p>
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" onClick={() => preguntar(s)} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[13px] text-slate-700 hover:border-brand">{s}</button>
            ))}
          </div>
        ) : (
          mensajes.map((m, i) => (
            <div key={i} className={m.rol === "usuario" ? "ml-8 rounded-xl rounded-br-sm bg-brand px-3 py-2 text-[13.5px] text-white" : "mr-2 rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-slate-800"}>
              {m.rol === "usuario" ? <p className="whitespace-pre-line">{m.texto}</p> : <><TextoIA texto={m.texto} /><Articulos articulos={m.articulos} /></>}
            </div>
          ))
        )}
        {enviando ? <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Consultando la ley…</p> : null}
        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
            {error}{sinCreditos ? <> <Link href={RUTA_CREDITOS} className="font-semibold underline">Recargar créditos</Link></> : null}
          </p>
        ) : null}
        <div ref={fin} />
      </div>
      <form className="space-y-2 border-t border-slate-200 bg-white px-4 py-3" onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}>
        <div className="flex items-end gap-2">
          <textarea aria-label="Tu pregunta" value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={2000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); preguntar(texto); } }}
            placeholder="Ej. ¿Cuánto es la prima vacacional?" className="min-h-11 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          <button type="submit" disabled={enviando || texto.trim().length < 3} aria-label="Enviar pregunta" className="grid size-11 place-items-center rounded-lg bg-brand text-white disabled:opacity-50"><Send className="size-4" /></button>
        </div>
        <p className="text-[11.5px] text-slate-500">Orientación con base en la LFT vigente (reforma DOF {fechaDOF(estado.lft?.reforma)}). No sustituye asesoría legal.</p>
        <Tope estado={estado} idEmpresa={idEmpresa} alCambiar={alCambiar} />
      </form>
    </div>
  );
}

export default function AdamiaAI() {
  const { dataUser } = useAuth() ?? {};
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const empresa = useEmpresaNomina();
  const estado = useSWR(abierto && empresa.idEmpresa ? `/checador/ia/estado?empresa=${empresa.idEmpresa}` : null, get, { shouldRetryOnError: false });
  // Solo en el panel de la empresa (no en el de administración de ADAMIA) y nunca para un empleado.
  if (!dataUser || dataUser.tipo_usuario === "Empleado" || !pathname?.startsWith("/panel")) return null;
  const codigo = estado.error?.response?.data?.codigo;
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} aria-label="Adamia AI" className="ml-auto inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-brand/30 bg-brand/5 px-2 text-xs font-semibold text-brand hover:bg-brand/10 sm:px-3">
        <Sparkles className="size-4 sm:size-3.5" /> <span className="hidden sm:inline">Adamia AI</span>
      </button>
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[460px]">
          <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 pr-12">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white"><Sparkles className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-extrabold text-[#080d36]">Adamia AI</SheetTitle>
              <SheetDescription className="text-[12.5px] text-slate-500">Ley Federal del Trabajo para tu empresa</SheetDescription>
            </div>
            <SelectorEmpresa {...empresa} />
          </div>
          {estado.isLoading || !empresa.idEmpresa ? (
            <p role="status" className="p-4 text-sm text-slate-500">Cargando…</p>
          ) : estado.error ? (
            <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{codigo === "SIN_MIGRACION" ? "Falta preparar la base de datos de Adamia AI." : errorDe(estado.error, "No se pudo cargar Adamia AI.")}</p>
          ) : !estado.data?.activo ? (
            <div className="p-4"><Activar estado={estado.data} idEmpresa={empresa.idEmpresa} alCambiar={() => estado.mutate()} /></div>
          ) : (
            <Chat idEmpresa={empresa.idEmpresa} estado={estado.data} alCambiar={() => estado.mutate()} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
