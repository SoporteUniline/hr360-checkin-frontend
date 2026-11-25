"use client";

// Créditos de Adamia AI (25/11/2026) · pantalla del dueño y RH: saldo en pesos, recargar (paquetes + IVA con Stripe),
// consumo del mes por función e historial de movimientos. Nunca muestra costo ni margen (el servidor tampoco los manda).
// El saldo se acredita solo cuando Stripe confirma el pago (webhook); al volver del pago la pantalla espera esa confirmación.
// En la app nativa no se ofrece recargar (las compras se hacen desde el navegador, como «Mi suscripción»).
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, History, Info, Loader2, Sparkles, TriangleAlert, Wallet } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { isNativeClient } from "@/lib/native-app";
import {
  avisoSaldo, debeEsperarConfirmacion, etiquetaTipo, mensajeRegreso, montoMovimiento, mxn, nombreMes,
} from "@/lib/ia/creditos.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const errorDe = (e, d) => e?.response?.data?.error || d;
const fecha = (f) => {
  if (!f) return "";
  const d = new Date(String(f).replace(" ", "T") + (String(f).includes("Z") ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? String(f) : d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const TONOS = {
  exito: { caja: "border-emerald-200 bg-emerald-50 text-emerald-800", Icono: CheckCircle2 },
  info: { caja: "border-blue-200 bg-blue-50 text-blue-800", Icono: Info },
  alerta: { caja: "border-amber-200 bg-amber-50 text-amber-800", Icono: TriangleAlert },
  bajo: { caja: "border-amber-200 bg-amber-50 text-amber-800", Icono: TriangleAlert },
  sin: { caja: "border-red-200 bg-red-50 text-red-800", Icono: TriangleAlert },
};

function Aviso({ tono, children }) {
  const t = TONOS[tono] ?? TONOS.info;
  return (
    <div role={tono === "sin" || tono === "alerta" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border p-3 text-[13.5px] ${t.caja}`}>
      <t.Icono className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0">{children}</p>
    </div>
  );
}

function Paquetes({ paquetes, idEmpresa, nativa }) {
  const [abriendo, setAbriendo] = useState(null);
  const [error, setError] = useState("");
  const recargar = async (p) => {
    setError(""); setAbriendo(p.id);
    try {
      const { data } = await axios.post("/checador/ia/creditos/recargar", { empresa: idEmpresa, id_paquete: p.id });
      window.location.assign(data.url);
    } catch (e) {
      setError(errorDe(e, "No se pudo abrir el pago. Intenta de nuevo."));
      setAbriendo(null);
    }
  };
  return (
    <section aria-labelledby="titulo-recargar" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="titulo-recargar" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><CreditCard className="size-4 text-brand" /> Recargar</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500">Se acredita el monto del paquete; el IVA se cobra aparte. Pagas con tarjeta en Stripe.</p>
      {nativa ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600">Las recargas se hacen desde el navegador en adamia.com.mx, con la misma cuenta.</p>
      ) : paquetes.length === 0 ? (
        <p className="mt-3 text-[13px] text-slate-500">No hay paquetes disponibles por ahora.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {paquetes.map((p) => (
            <li key={p.id} className="flex flex-col rounded-xl border border-slate-200 p-3">
              <p className="text-xl font-extrabold tracking-tight text-slate-900">{mxn(p.monto_mxn)}</p>
              <p className="text-[12px] text-slate-500">+ IVA {mxn(p.iva_mxn)} · total {mxn(p.total_mxn)}</p>
              <button type="button" onClick={() => recargar(p)} disabled={abriendo != null} data-paquete={p.monto_mxn}
                className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white disabled:opacity-60">
                {abriendo === p.id ? <Loader2 className="size-4 animate-spin" /> : null} Recargar {mxn(p.monto_mxn)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p role="alert" className="mt-2 text-[13px] text-red-700">{error}</p> : null}
    </section>
  );
}

function Consumo({ data }) {
  const total = data.consumo_mes.reduce((s, f) => s + f.mxn, 0);
  return (
    <section aria-labelledby="titulo-consumo" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="titulo-consumo" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Sparkles className="size-4 text-brand" /> Consumo de {nombreMes(data.mes)}</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500">{data.cobro_activo ? "Lo que se descontó de tu saldo por cada función." : "Lo que habría costado cada función (aún no se descuenta)."}</p>
      {data.consumo_mes.length === 0 ? <p className="mt-3 text-[13px] text-slate-500">Aún no hay consultas este mes.</p> : (
        <ul className="mt-3 divide-y divide-slate-100">
          {data.consumo_mes.map((f) => (
            <li key={f.funcion} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
              <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{f.nombre}</span><span className="text-[12px] text-slate-500">{f.usos} {f.usos === 1 ? "consulta" : "consultas"}</span></span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">{mxn(f.mxn)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-2 text-[13.5px] font-bold"><span>Total</span><span className="tabular-nums">{mxn(total)}</span></li>
        </ul>
      )}
    </section>
  );
}

function Historial({ idEmpresa, inicial, hayMas: hayMasInicial }) {
  const [extra, setExtra] = useState([]);
  const [hayMas, setHayMas] = useState(hayMasInicial);
  const [cargando, setCargando] = useState(false);
  useEffect(() => { setExtra([]); setHayMas(hayMasInicial); }, [inicial, hayMasInicial]);
  const lista = useMemo(() => [...inicial, ...extra], [inicial, extra]);
  const masAntiguos = async () => {
    setCargando(true);
    try {
      const { data } = await axios.get(`/checador/ia/creditos?empresa=${idEmpresa}&antes=${lista.at(-1).id}`);
      setExtra((x) => [...x, ...data.movimientos]); setHayMas(data.hay_mas);
    } finally { setCargando(false); }
  };
  return (
    <section aria-labelledby="titulo-historial" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="titulo-historial" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><History className="size-4 text-brand" /> Movimientos</h2>
      {lista.length === 0 ? <p className="mt-3 text-[13px] text-slate-500">Todavía no hay movimientos. Tu primera recarga aparecerá aquí.</p> : (
        <ul className="mt-2 divide-y divide-slate-100" data-historial>
          {lista.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 py-2.5 text-[13.5px]">
              <span className="min-w-0">
                <span className="block font-medium text-slate-800">{etiquetaTipo(m.tipo)}{m.concepto ? <span className="font-normal text-slate-500"> · {m.concepto}</span> : null}</span>
                <span className="text-[12px] text-slate-500">{fecha(m.creado_en)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block font-semibold tabular-nums ${m.monto_mxn > 0 ? "text-emerald-700" : "text-slate-900"}`}>{montoMovimiento(m.monto_mxn)}</span>
                <span className="text-[12px] tabular-nums text-slate-500">Saldo {mxn(m.saldo_despues)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {hayMas ? (
        <button type="button" onClick={masAntiguos} disabled={cargando} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-60">
          {cargando ? <Loader2 className="size-4 animate-spin" /> : null} Ver anteriores
        </button>
      ) : null}
    </section>
  );
}

export default function CreditosIA() {
  const empresa = useEmpresaNomina();
  const params = useSearchParams();
  const regreso = useMemo(() => ({ compra: params.get("compra"), folio: Number(params.get("folio")) || null, simulada: params.get("simulada") === "1" }), [params]);
  const [intentos, setIntentos] = useState(0);
  const [nativa, setNativa] = useState(false);
  useEffect(() => { setNativa(isNativeClient()); }, []);
  const llave = empresa.idEmpresa ? `/checador/ia/creditos?empresa=${empresa.idEmpresa}${regreso.folio ? `&folio=${regreso.folio}` : ""}` : null;
  const esperar = (d) => debeEsperarConfirmacion(regreso, d?.compra?.estado) && intentos < 12;
  const { data, error, isLoading } = useSWR(llave, get, {
    shouldRetryOnError: false, revalidateOnFocus: true,
    refreshInterval: (d) => (esperar(d) ? 2500 : 0),
    onSuccess: (d) => { if (esperar(d)) setIntentos((n) => n + 1); },
  });
  const aviso = data ? avisoSaldo(data) : null;
  const mensaje = data ? mensajeRegreso(regreso, data.compra?.estado) : null;
  const codigo = error?.response?.data?.codigo;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <EncabezadoPagina icono={Wallet} titulo="Créditos de Adamia AI" subtitulo="Saldo en pesos para usar Adamia AI en tu empresa" acciones={<SelectorEmpresa {...empresa} />} />
      {isLoading || !empresa.idEmpresa ? <p role="status" className="text-sm text-slate-500">Cargando…</p> : null}
      {error ? <Aviso tono="alerta">{codigo === "SIN_MIGRACION" ? "Falta preparar la base de datos de créditos de Adamia AI." : errorDe(error, "No se pudieron cargar tus créditos.")}</Aviso> : null}
      {data && !data.disponible ? <Aviso tono="info">Los créditos de Adamia AI aún no están disponibles en tu cuenta.</Aviso> : null}
      {data?.disponible ? (
        <>
          {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}
          {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
          <section aria-label="Saldo" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-violet-50 p-4 sm:p-5">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-slate-500">Saldo disponible</p>
            <p className={`mt-1 text-4xl font-extrabold tracking-tight tabular-nums ${data.sin_creditos ? "text-red-700" : "text-slate-900"}`} data-saldo>{mxn(data.saldo_mxn)} <span className="text-base font-bold text-slate-500">MXN</span></p>
            {data.ultima_recarga_mxn > 0 ? <p className="mt-1 text-[12.5px] text-slate-500">Última recarga: {mxn(data.ultima_recarga_mxn)}</p> : null}
            <p className="mt-2 text-[12.5px] text-slate-600">Cada consulta a Adamia AI en el panel descuenta su precio. El agente de WhatsApp no usa estos créditos: va en tus paquetes de entrevistas.</p>
          </section>
          <Paquetes paquetes={data.paquetes} idEmpresa={empresa.idEmpresa} nativa={nativa} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Consumo data={data} />
            <Historial idEmpresa={empresa.idEmpresa} inicial={data.movimientos} hayMas={data.hay_mas} />
          </div>
        </>
      ) : null}
    </div>
  );
}
