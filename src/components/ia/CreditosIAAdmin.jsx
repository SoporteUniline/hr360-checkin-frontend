"use client";

// Créditos de Adamia AI (25/11/2026) · panel del administrador de ADAMIA: por empresa y mes el costo (USD, y el del agente de
// WhatsApp aparte), lo cobrado en pesos y la ganancia; tipo de cambio (aviso si tiene más de 30 días), margen global y por
// empresa, regalos/ajustes con motivo y paquetes de recarga. El servidor valida todo (solo tipo_usuario Admin).
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Coins, Gift, ListOrdered, Loader2, Percent, Plus, TriangleAlert } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  bienvenidaUsdDesdeTexto, claveFormulario, cuerpoBienvenida, etiquetaTipo, margenDesdePorcentaje, mesesRecientes, montoMovimiento, mxn, nombreMes, porcentaje,
  precioEjemplo, resumenBienvenida, tcTexto, tcValido, usd, validarMovimiento,
} from "@/lib/ia/creditos.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const errorDe = (e, d) => e?.response?.data?.error || d;
const caja = "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5";
const campo = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand focus:outline-none";
const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60";
const botonSec = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const fechaCorta = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "—");

function Kpi({ titulo, valor, nota, tono = "text-slate-900" }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <p className="truncate text-[12px] font-semibold text-slate-500">{titulo}</p>
      <p className={`mt-0.5 truncate text-lg font-extrabold tabular-nums ${tono}`}>{valor}</p>
      {nota ? <p className="truncate text-[11.5px] text-slate-500">{nota}</p> : null}
    </div>
  );
}

function TipoCambio({ tc, alGuardar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [valor, setValor] = useState("");
  const [fuente, setFuente] = useState("");
  const [fecha, setFecha] = useState("");
  const [guardando, setGuardando] = useState(false);
  const guardar = async (e) => {
    e.preventDefault();
    const n = tcValido(valor);
    if (!n) return enqueueSnackbar("El tipo de cambio debe estar entre $1 y $100 por dólar.", { variant: "error" });
    setGuardando(true);
    try {
      await axios.post("/checador/ia/admin/tipo-cambio", { usd_mxn: n, fuente: fuente || undefined, fecha_referencia: fecha || undefined });
      enqueueSnackbar("Tipo de cambio guardado. Aplica a los usos desde ahora.", { variant: "success" });
      setValor(""); setFuente(""); setFecha("");
      await alGuardar();
    } catch (err) { enqueueSnackbar(errorDe(err, "No se pudo guardar."), { variant: "error" }); } finally { setGuardando(false); }
    return undefined;
  };
  return (
    <section aria-labelledby="titulo-tc" className={caja}>
      <h2 id="titulo-tc" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Coins className="size-4 text-brand" /> Tipo de cambio</h2>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{mxn(tc.usd_mxn)} <span className="text-sm font-semibold text-slate-500">por dólar</span></p>
      <p className="text-[12px] text-slate-500">{tc.fuente === "admin" ? `Registrado ${fechaCorta(tc.registrado_en)} (${tc.dias} ${tc.dias === 1 ? "día" : "días"})` : "Sin registrar"}</p>
      {tc.aviso ? <p role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-800"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{tc.aviso}</p> : null}
      <form onSubmit={guardar} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="block text-[12.5px] font-semibold text-slate-700">Nuevo (MXN por USD)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="18.45" className={`${campo} mt-1`} /></label>
        <label className="block text-[12.5px] font-semibold text-slate-700">Fecha de referencia<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${campo} mt-1`} /></label>
        <label className="block text-[12.5px] font-semibold text-slate-700">Fuente<input value={fuente} maxLength={150} onChange={(e) => setFuente(e.target.value)} placeholder="DOF / Banxico" className={`${campo} mt-1`} /></label>
        <button type="submit" disabled={guardando} className={boton}>{guardando ? <Loader2 className="size-4 animate-spin" /> : null} Guardar</button>
      </form>
      {tc.historial?.length ? (
        <details className="mt-3 text-[12.5px] text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-700">Historial</summary>
          <ul className="mt-1 divide-y divide-slate-100">
            {tc.historial.map((h) => <li key={h.id} className="flex justify-between gap-2 py-1"><span>{fechaCorta(h.creado_en)} · {h.fuente || "sin fuente"} · {h.registrado_por || ""}</span><span className="tabular-nums">{mxn(h.usd_mxn)}</span></li>)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function Margen({ margen, tc, alGuardar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [valor, setValor] = useState(String(Math.round(margen * 1000) / 10));
  const [guardando, setGuardando] = useState(false);
  const m = margenDesdePorcentaje(valor);
  const ejemplo = m == null ? null : precioEjemplo({ costoUsd: 1, tipoCambio: tc, margen: m });
  const guardar = async (e) => {
    e.preventDefault();
    if (m == null) return enqueueSnackbar("El margen debe estar entre 0 y 90 %.", { variant: "error" });
    setGuardando(true);
    try { await axios.put("/checador/ia/admin/margen", { margen: m }); enqueueSnackbar("Margen global guardado.", { variant: "success" }); await alGuardar(); }
    catch (err) { enqueueSnackbar(errorDe(err, "No se pudo guardar."), { variant: "error" }); } finally { setGuardando(false); }
    return undefined;
  };
  return (
    <section aria-labelledby="titulo-margen" className={caja}>
      <h2 id="titulo-margen" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Percent className="size-4 text-brand" /> Margen global</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500">precio = costo × tipo de cambio ÷ (1 − margen). 50 % = se vende al doble del costo.</p>
      <form onSubmit={guardar} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block w-32 text-[12.5px] font-semibold text-slate-700">Margen (%)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={`${campo} mt-1`} /></label>
        <button type="submit" disabled={guardando} className={boton}>{guardando ? <Loader2 className="size-4 animate-spin" /> : null} Guardar</button>
      </form>
      <p className="mt-2 text-[13px] text-slate-700" data-ejemplo-precio>{ejemplo == null ? "Margen inválido." : `Ejemplo: costo $1 USD × ${mxn(tc)} → ${mxn(ejemplo)} MXN + IVA`}</p>
    </section>
  );
}

function Paquetes({ paquetes, alGuardar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [nuevo, setNuevo] = useState("");
  const [ocupado, setOcupado] = useState(null);
  const enviar = async (id, metodo, url, cuerpo, ok) => {
    setOcupado(id);
    try { await axios[metodo](url, cuerpo); enqueueSnackbar(ok, { variant: "success" }); await alGuardar(); return true; }
    catch (err) { enqueueSnackbar(errorDe(err, "No se pudo guardar."), { variant: "error" }); return false; } finally { setOcupado(null); }
  };
  return (
    <section aria-labelledby="titulo-paquetes" className={caja}>
      <h2 id="titulo-paquetes" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><ListOrdered className="size-4 text-brand" /> Paquetes de recarga</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500">Monto en pesos sin IVA (es lo que se acredita). Stripe cobra el monto + 16 % de IVA.</p>
      <ul className="mt-2 divide-y divide-slate-100">
        {paquetes.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-[13.5px]">
            <span className={p.activo ? "font-semibold text-slate-900" : "text-slate-400 line-through"}>{mxn(p.monto_mxn)}</span>
            <button type="button" className={botonSec} disabled={ocupado === p.id}
              onClick={() => enviar(p.id, "put", `/checador/ia/admin/paquetes/${p.id}`, { activo: !p.activo }, p.activo ? "Paquete oculto." : "Paquete visible.")}>
              {p.activo ? "Ocultar" : "Mostrar"}
            </button>
          </li>
        ))}
      </ul>
      <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await enviar("nuevo", "post", "/checador/ia/admin/paquetes", { monto_mxn: Number(nuevo), orden: paquetes.length + 1 }, "Paquete agregado.")) setNuevo(""); }}>
        <label className="block w-40 text-[12.5px] font-semibold text-slate-700">Nuevo paquete (MXN)<input inputMode="decimal" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="2000" className={`${campo} mt-1`} /></label>
        <button type="submit" className={botonSec} disabled={ocupado === "nuevo" || !nuevo}><Plus className="size-4" /> Agregar</button>
      </form>
    </section>
  );
}

// (24/12/2026) Crédito de bienvenida: «todos con solo 1 dólar». Monto en dólares (se convierte con el TC registrado), vista
// previa de cuántas empresas faltan y total, y «Dar a todas» con confirmación. El servidor rechaza (409) si algo cambió desde
// la vista previa y abona una sola vez por empresa. Las empresas nuevas lo reciben solas al darse de alta.
function DialogoBienvenida({ vista, alCerrar, alTerminar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const r = resumenBienvenida(vista);
  const confirmar = async () => {
    setEnviando(true); setError("");
    try {
      const { data } = await axios.post("/checador/ia/admin/bienvenida/todas", cuerpoBienvenida(vista));
      await alTerminar(data);
    } catch (err) { setError(errorDe(err, "No se pudo completar.")); } finally { setEnviando(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !enviando) alCerrar(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dar crédito de bienvenida a todas</DialogTitle>
          <DialogDescription>Revisa el resumen. Cada empresa lo recibe una sola vez y lo ve en su historial.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]" data-resumen-bienvenida>
          <dt className="text-slate-500">Empresas</dt><dd className="text-right font-semibold tabular-nums">{vista.pendientes}</dd>
          <dt className="text-slate-500">A cada una</dt><dd className="text-right tabular-nums">{r.conversion}</dd>
          <dt className="text-slate-500">Tipo de cambio</dt><dd className="text-right tabular-nums">{tcTexto(vista.tipo_cambio.usd_mxn)} · {fechaCorta(vista.tipo_cambio.registrado_en)}</dd>
          <dt className="font-semibold text-slate-700">Total</dt><dd className="text-right text-lg font-extrabold tabular-nums">{mxn(vista.total_mxn)} MXN</dd>
        </dl>
        {vista.lista?.length ? (
          <details className="text-[12.5px] text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700">Ver empresas{vista.pendientes > vista.lista.length ? ` (primeras ${vista.lista.length})` : ""}</summary>
            <ul className="mt-1 max-h-40 overflow-y-auto">{vista.lista.map((e) => <li key={e.id_empresa} className="break-words py-0.5">#{e.id_empresa} · {e.empresa}</li>)}</ul>
          </details>
        ) : null}
        {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        <DialogFooter>
          <button type="button" className={botonSec} disabled={enviando} onClick={alCerrar}>Cancelar</button>
          <button type="button" className={boton} disabled={enviando} onClick={confirmar}>{enviando ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />} Confirmar y abonar {mxn(vista.total_mxn)}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Bienvenida({ alAbonar }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: vista, error, mutate } = useSWR("/checador/ia/admin/bienvenida", get, { shouldRetryOnError: false });
  const [usd, setUsd] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ultimo, setUltimo] = useState(null);
  if (error) {
    return <section aria-labelledby="titulo-bienvenida" className={caja}><h2 id="titulo-bienvenida" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Gift className="size-4 text-brand" /> Crédito de bienvenida</h2>
      <p role="alert" className="mt-2 text-[13px] text-amber-800">{errorDe(error, "No se pudo cargar.")}</p></section>;
  }
  if (!vista) return null;
  const valor = usd ?? String(vista.usd);
  const r = resumenBienvenida(vista);
  const guardarMonto = async (e) => {
    e.preventDefault();
    const n = bienvenidaUsdDesdeTexto(valor);
    if (n == null) return enqueueSnackbar("El crédito de bienvenida va de US$0 (apagado) a US$50, con hasta 2 decimales.", { variant: "error" });
    setGuardando(true);
    try { await axios.put("/checador/ia/admin/bienvenida", { usd: n }); enqueueSnackbar(n === 0 ? "Crédito de bienvenida apagado para empresas nuevas." : `Crédito de bienvenida: US$${n.toFixed(2)}.`, { variant: "success" }); setUsd(null); await mutate(); }
    catch (err) { enqueueSnackbar(errorDe(err, "No se pudo guardar."), { variant: "error" }); } finally { setGuardando(false); }
    return undefined;
  };
  const alTerminar = async (data) => {
    setConfirmando(false); setUltimo(data);
    enqueueSnackbar(`Listo: ${data.acreditadas} ${data.acreditadas === 1 ? "empresa recibió" : "empresas recibieron"} ${mxn(data.monto_mxn)} (total ${mxn(data.total_mxn)}).`, { variant: "success" });
    await mutate(); await alAbonar();
  };
  return (
    <section aria-labelledby="titulo-bienvenida" className={caja} data-bienvenida>
      <h2 id="titulo-bienvenida" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Gift className="size-4 text-brand" /> Crédito de bienvenida</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500">Saldo de regalo para cada empresa, una sola vez. Se convierte a pesos con el tipo de cambio registrado. Las empresas nuevas lo reciben al darse de alta.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <form onSubmit={guardarMonto} className="flex flex-wrap items-end gap-2">
          <label className="block w-36 text-[12.5px] font-semibold text-slate-700">Monto (US$)<input inputMode="decimal" value={valor} onChange={(e) => setUsd(e.target.value)} className={`${campo} mt-1`} /></label>
          <button type="submit" disabled={guardando || valor === String(vista.usd)} className={botonSec}>{guardando ? <Loader2 className="size-4 animate-spin" /> : null} Guardar monto</button>
          <p className="w-full text-[12px] text-slate-500">{r.conversion ? `Hoy: ${r.conversion}` : "Sin tipo de cambio registrado."} · Ya lo recibieron {vista.ya_recibieron} ({mxn(vista.ya_recibieron_mxn)})</p>
        </form>
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[13px] font-semibold text-slate-800">{vista.pendientes} {vista.pendientes === 1 ? "empresa pendiente" : "empresas pendientes"}{vista.listo ? ` · total ${mxn(vista.total_mxn)} MXN` : ""}</p>
          <p className={`mt-0.5 text-[12.5px] ${vista.listo ? "text-slate-600" : "text-amber-800"}`} role={vista.listo ? undefined : "status"}>{r.texto}</p>
          <button type="button" className={`${boton} mt-2 w-full sm:w-auto`} disabled={!vista.listo || valor !== String(vista.usd)} onClick={() => setConfirmando(true)}>
            <Gift className="size-4" /> Dar crédito de bienvenida a todas{vista.listo ? ` (${vista.pendientes})` : ""}
          </button>
          {ultimo ? <p role="status" className="mt-2 text-[12.5px] text-emerald-800">Última corrida: {ultimo.acreditadas} acreditadas · {ultimo.ya_tenian} ya lo tenían{ultimo.errores?.length ? ` · ${ultimo.errores.length} con error (reintenta)` : ""} · total {mxn(ultimo.total_mxn)}.</p> : null}
        </div>
      </div>
      {confirmando ? <DialogoBienvenida vista={vista} alCerrar={() => setConfirmando(false)} alTerminar={alTerminar} /> : null}
    </section>
  );
}

function DialogoAjuste({ empresa, alCerrar, alGuardar }) {
  const { enqueueSnackbar } = useSnackbar();
  const [tipo, setTipo] = useState("regalo");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const clave = useMemo(() => claveFormulario(), []);
  const guardar = async (e) => {
    e.preventDefault();
    const v = validarMovimiento({ tipo, monto, motivo });
    if (!v.ok) return setError(v.error);
    setError(""); setGuardando(true);
    try {
      const { data } = await axios.post(`/checador/ia/admin/creditos/${empresa.id_empresa}/movimientos`, { ...v.datos, clave });
      enqueueSnackbar(`Listo. Saldo de ${empresa.empresa}: ${mxn(data.saldo_mxn)}.`, { variant: "success" });
      await alGuardar(); alCerrar();
    } catch (err) { setError(errorDe(err, "No se pudo guardar.")); } finally { setGuardando(false); }
    return undefined;
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) alCerrar(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regalar o ajustar créditos</DialogTitle>
          <DialogDescription>{empresa.empresa} · saldo actual {mxn(empresa.saldo_mxn)}. El motivo lo ve el cliente en su historial.</DialogDescription>
        </DialogHeader>
        <form id="form-ajuste" onSubmit={guardar} className="space-y-3">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-[12.5px] font-semibold text-slate-700">Tipo</legend>
            {[["regalo", "Regalo (+)"], ["ajuste", "Ajuste (±)"], ["reembolso", "Reembolso (−)"]].map(([v, t]) => (
              <label key={v} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${tipo === v ? "border-brand bg-brand/5 font-semibold text-brand" : "border-slate-300"}`}>
                <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} className="sr-only" />{t}
              </label>
            ))}
          </fieldset>
          <label className="block text-[12.5px] font-semibold text-slate-700">Monto (MXN){tipo === "ajuste" ? " · negativo para descontar" : ""}<input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} className={`${campo} mt-1`} /></label>
          <label className="block text-[12.5px] font-semibold text-slate-700">Motivo<textarea value={motivo} maxLength={300} rows={2} onChange={(e) => setMotivo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" /></label>
          {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        </form>
        <DialogFooter>
          <button type="button" className={botonSec} onClick={alCerrar}>Cancelar</button>
          <button type="submit" form="form-ajuste" disabled={guardando} className={boton}>{guardando ? <Loader2 className="size-4 animate-spin" /> : null} Guardar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoEmpresa({ empresa, margenGlobal, alCerrar, alGuardar }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data } = useSWR(`/checador/ia/admin/creditos/${empresa.id_empresa}/movimientos`, get);
  const [margen, setMargen] = useState(empresa.margen == null ? "" : String(Math.round(empresa.margen * 1000) / 10));
  const guardarMargen = async () => {
    const valor = margen.trim() === "" ? null : margenDesdePorcentaje(margen);
    if (margen.trim() !== "" && valor == null) return enqueueSnackbar("El margen debe estar entre 0 y 90 %, o vacío para usar el global.", { variant: "error" });
    try { await axios.put(`/checador/ia/admin/margen/${empresa.id_empresa}`, { margen: valor }); enqueueSnackbar("Margen de la empresa guardado.", { variant: "success" }); await alGuardar(); }
    catch (err) { enqueueSnackbar(errorDe(err, "No se pudo guardar."), { variant: "error" }); }
    return undefined;
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) alCerrar(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{empresa.empresa}</DialogTitle>
          <DialogDescription>Saldo {mxn(empresa.saldo_mxn)}{data?.cuadre ? (data.cuadre.cuadra ? " · el libro cuadra" : " · ⚠ el saldo no cuadra con los movimientos") : ""}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block w-40 text-[12.5px] font-semibold text-slate-700">Margen de esta empresa (%)<input inputMode="decimal" value={margen} placeholder={`Global ${porcentaje(margenGlobal)}`} onChange={(e) => setMargen(e.target.value)} className={`${campo} mt-1`} /></label>
          <button type="button" onClick={guardarMargen} className={botonSec}>Guardar margen</button>
        </div>
        <ul className="divide-y divide-slate-100 text-[13px]">
          {(data?.movimientos ?? []).map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-2 py-1.5">
              <span className="min-w-0"><span className="font-medium">{etiquetaTipo(m.tipo)}</span> <span className="text-slate-500">· {m.funcion || m.motivo || m.referencia}</span>
                <span className="block text-[11.5px] text-slate-500">{String(m.creado_en).slice(0, 16)} {m.creado_por ? `· ${m.creado_por}` : ""}{m.no_cubierto_mxn > 0 ? ` · no cubierto ${mxn(m.no_cubierto_mxn)}` : ""}</span></span>
              <span className="shrink-0 text-right tabular-nums">{montoMovimiento(m.monto_mxn)}<span className="block text-[11.5px] text-slate-500">{mxn(m.saldo_despues)}</span></span>
            </li>
          ))}
          {data && !data.movimientos.length ? <li className="py-2 text-slate-500">Sin movimientos.</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Empresas({ filas, alAjustar, alVer }) {
  if (!filas.length) return <p className="text-[13px] text-slate-500">Sin uso de Adamia AI en este mes.</p>;
  const margen = (f) => (f.margen == null ? "Global" : porcentaje(f.margen));
  return (
    <>
      <ul className="space-y-2 md:hidden" aria-label="Empresas">
        {filas.map((f) => (
          <li key={f.id_empresa} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2"><p className="min-w-0 break-words font-bold text-slate-900">{f.empresa}</p><p className="shrink-0 font-bold tabular-nums text-emerald-700">{mxn(f.ganancia_mxn)}</p></div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
              <dt className="text-slate-500">Costo IA</dt><dd className="text-right tabular-nums">{usd(f.costo_usd)}</dd>
              <dt className="text-slate-500">· de WhatsApp</dt><dd className="text-right tabular-nums">{usd(f.costo_usd_whatsapp)}</dd>
              <dt className="text-slate-500">Cobrado</dt><dd className="text-right tabular-nums">{mxn(f.cobrado_mxn)}</dd>
              <dt className="text-slate-500">Saldo</dt><dd className="text-right tabular-nums">{mxn(f.saldo_mxn)}</dd>
              <dt className="text-slate-500">Margen</dt><dd className="text-right">{margen(f)}</dd>
            </dl>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className={botonSec} onClick={() => alAjustar(f)}><Gift className="size-4" /> Regalar</button>
              <button type="button" className={botonSec} onClick={() => alVer(f)}>Detalle</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-[12px] text-slate-600">
            <tr>
              <th className="px-3 py-2">Empresa</th><th className="px-3 py-2 text-right">Usos</th><th className="px-3 py-2 text-right">Costo USD</th>
              <th className="px-3 py-2 text-right">WhatsApp USD</th><th className="px-3 py-2 text-right">Costo MXN cobrado</th><th className="px-3 py-2 text-right">Cobrado MXN</th>
              <th className="px-3 py-2 text-right">Ganancia</th><th className="px-3 py-2 text-right">Saldo</th><th className="px-3 py-2">Margen</th><th className="px-3 py-2"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((f) => (
              <tr key={f.id_empresa}>
                <td className="px-3 py-2 font-semibold text-slate-900">{f.empresa}{f.no_cubierto_mxn > 0 ? <span className="block text-[11.5px] font-normal text-amber-700">No cubierto {mxn(f.no_cubierto_mxn)}</span> : null}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.usos}</td>
                <td className="px-3 py-2 text-right tabular-nums">{usd(f.costo_usd)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{usd(f.costo_usd_whatsapp)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{mxn(f.costo_mxn_cobrado)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{mxn(f.cobrado_mxn)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">{mxn(f.ganancia_mxn)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{mxn(f.saldo_mxn)}</td>
                <td className="px-3 py-2">{margen(f)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button type="button" className="rounded-md px-2 py-1 font-semibold text-brand hover:bg-brand/5" onClick={() => alAjustar(f)}>Regalar</button>
                  <button type="button" className="rounded-md px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100" onClick={() => alVer(f)}>Detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function CreditosIAAdmin() {
  const meses = useMemo(() => mesesRecientes(), []);
  const [mes, setMes] = useState(meses[0]);
  const { data, error, isLoading, mutate } = useSWR(`/checador/ia/admin/creditos?mes=${mes}`, get, { shouldRetryOnError: false });
  const [ajustar, setAjustar] = useState(null);
  const [ver, setVer] = useState(null);
  const [otra, setOtra] = useState("");
  const refrescar = () => mutate();
  const t = data?.totales ?? {};
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <EncabezadoPagina icono={Coins} titulo="Créditos de Adamia AI" subtitulo="Costo, cobro y ganancia de la IA por empresa"
        acciones={<select aria-label="Mes" value={mes} onChange={(e) => setMes(e.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm">{meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}</select>} />
      {isLoading ? <p role="status" className="text-sm text-slate-500">Cargando…</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorDe(error, "No se pudo cargar.")}</p> : null}
      {data ? (
        <>
          <p role="status" className={`rounded-xl border p-3 text-[13px] ${data.cobro_activo ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
            {data.cobro_activo ? "Cobro por créditos ENCENDIDO: el uso del panel descuenta saldo y sin saldo se bloquea."
              : "Cobro por créditos APAGADO (IA_COBRO_CREDITOS): se mide todo y se muestra el saldo, pero no se descuenta ni se bloquea."}
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <Kpi titulo="Costo de IA" valor={usd(t.costo_usd)} nota={`WhatsApp ${usd(t.costo_usd_whatsapp)}`} />
            <Kpi titulo="Cobrado" valor={mxn(t.cobrado_mxn)} nota="sin IVA" />
            <Kpi titulo="Ganancia" valor={mxn(t.ganancia_mxn)} nota={`costo ${mxn(t.costo_mxn_cobrado)}`} tono="text-emerald-700" />
            <Kpi titulo="No cubierto" valor={mxn(t.no_cubierto_mxn)} nota="lo absorbe ADAMIA" tono={t.no_cubierto_mxn > 0 ? "text-amber-700" : "text-slate-900"} />
            <Kpi titulo={data.cobro_activo ? "Compras" : "Se habría cobrado"} valor={mxn(data.cobro_activo ? t.compras_mxn : t.precio_sin_cobro_mxn)} nota={data.cobro_activo ? "recargas del mes" : "con el cobro apagado"} />
          </div>
          {data.modelos?.aviso ? <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{data.modelos.aviso}</p> : null}
          {data.modelos ? <p className="text-[12px] text-slate-500" data-modelos>Modelos: {data.modelos.lista.map((m) => `${m.uso === "panel" ? "panel" : "WhatsApp"} ${m.modelo}`).join(" · ")} · precios revisados {fechaCorta(data.modelos.precios_revisados)}</p> : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><TipoCambio tc={data.tipo_cambio} alGuardar={refrescar} /></div>
            <Margen key={data.margen_global} margen={data.margen_global} tc={data.tipo_cambio.usd_mxn} alGuardar={refrescar} />
          </div>
          <section aria-labelledby="titulo-empresas" className="space-y-2">
            <h2 id="titulo-empresas" className="text-[15px] font-bold text-slate-900">Empresas · {nombreMes(data.mes)}</h2>
            <Empresas filas={data.empresas} alAjustar={setAjustar} alVer={setVer} />
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
              e.preventDefault();
              const id = Number(otra);
              if (!Number.isInteger(id) || id <= 0) return;
              setAjustar(data.empresas.find((f) => f.id_empresa === id) ?? { id_empresa: id, empresa: `Empresa #${id}`, saldo_mxn: 0 });
              setOtra("");
            }}>
              <label className="block w-44 text-[12.5px] font-semibold text-slate-700">Regalar a otra empresa (núm.)<input inputMode="numeric" value={otra} onChange={(e) => setOtra(e.target.value.replace(/\D/g, ""))} className={`${campo} mt-1`} /></label>
              <button type="submit" className={botonSec} disabled={!otra}><Gift className="size-4" /> Regalar</button>
            </form>
          </section>
          <Bienvenida alAbonar={refrescar} />
          <Paquetes paquetes={data.paquetes} alGuardar={refrescar} />
        </>
      ) : null}
      {ajustar ? <DialogoAjuste empresa={ajustar} alCerrar={() => setAjustar(null)} alGuardar={refrescar} /> : null}
      {ver ? <DialogoEmpresa empresa={ver} margenGlobal={data?.margen_global ?? 0.5} alCerrar={() => setVer(null)} alGuardar={refrescar} /> : null}
    </div>
  );
}
