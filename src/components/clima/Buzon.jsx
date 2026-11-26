"use client";

// Buzón confidencial NOM-035 (8.1 b) · panel de RH y dueño: la liga de la empresa (copiar o compartir por WhatsApp) y las
// quejas. La lista no trae el relato: se ve al abrir cada una y abrirla queda en la bitácora. API: /buzon, /buzon/:id.
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fechaCorta } from "@/lib/clima/modelo.mjs";
import { ACCION_BITACORA, ESTADOS_QUEJA, TIPOS_QUEJA, ligaWhatsapp, textoCompartirBuzon, urlBuzon } from "@/lib/clima/inspeccion.mjs";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, codigoDe, errorDe, get, ruta } from "./ui";

const CAMPO = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900";
const fechaHora = (v) => (v ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(v)) : "");

function ChipEstado({ estado }) {
  const e = ESTADOS_QUEJA[estado] ?? ESTADOS_QUEJA.recibida;
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold ${e.clase}`}>{e.texto}</span>;
}

function Detalle({ idEmpresa, id, alCerrar, alCambiar }) {
  const { enqueueSnackbar } = useSnackbar();
  const q = useSWR(id ? ruta(`/buzon/${id}`, idEmpresa) : null, get, { revalidateOnFocus: false });
  const [cambios, setCambios] = useState({});
  const [guardando, setGuardando] = useState(false);
  const queja = q.data?.queja;
  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await axios.patch(ruta(`/buzon/${id}`, idEmpresa), { ...cambios, revision: queja.revision });
      q.mutate(r.data, false);
      setCambios({});
      enqueueSnackbar("Queja actualizada.", { variant: "success" });
      alCambiar();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Dialog open={Boolean(id)} onOpenChange={(v) => !v && alCerrar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Queja {queja?.folio ?? ""}</DialogTitle>
          <DialogDescription>Confidencial. Abrirla y cada cambio quedan en la bitácora con tu nombre.</DialogDescription>
        </DialogHeader>
        {!queja ? (
          <Cargando />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ChipEstado estado={queja.estado} />
              <span className="text-[13px] font-semibold text-slate-700">{TIPOS_QUEJA[queja.tipo]}</span>
              <span className="text-[13px] text-slate-500">· recibida el {fechaCorta(queja.recibida_el)} · por {queja.canal}</span>
            </div>
            <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-[14px] text-slate-900">{queja.relato}</p>
            <p className="text-[13px] text-slate-600">
              {queja.nombre_contacto || queja.contacto ? `Se identificó: ${[queja.nombre_contacto, queja.contacto].filter(Boolean).join(" · ")}` : "Anónima: no dejó nombre ni contacto."}
              {queja.centro ? ` Centro: ${queja.centro}.` : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-slate-700">Estado</span>
                <select className={CAMPO} value={cambios.estado ?? queja.estado} onChange={(e) => setCambios({ ...cambios, estado: e.target.value })}>
                  {Object.entries(ESTADOS_QUEJA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.texto}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-slate-700">Nota interna (solo bitácora)</span>
                <input className={CAMPO} maxLength={1000} value={cambios.nota ?? ""} onChange={(e) => setCambios({ ...cambios, nota: e.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-slate-700">Respuesta para quien denunció (la ve con su folio)</span>
              <textarea
                className={`${CAMPO} min-h-20 py-2`}
                maxLength={2000}
                value={cambios.respuesta ?? queja.respuesta ?? ""}
                onChange={(e) => setCambios({ ...cambios, respuesta: e.target.value })}
              />
            </label>
            <details className="rounded-xl border border-slate-200 p-3">
              <summary className="min-h-11 cursor-pointer py-2 text-[14px] font-semibold text-slate-800">Bitácora ({q.data.bitacora.length})</summary>
              <ol className="mt-2 space-y-1">
                {q.data.bitacora.map((b, i) => (
                  <li key={i} className="text-[13px] text-slate-700">
                    <span className="text-slate-500">{fechaHora(b.en)}</span> · {ACCION_BITACORA[b.accion] ?? b.accion}
                    {b.por ? ` · ${b.por}` : ""}
                    {b.detalle && b.accion !== "respuesta" ? <span className="block pl-3 text-slate-500">{b.detalle}</span> : null}
                  </li>
                ))}
              </ol>
            </details>
          </div>
        )}
        <DialogFooter>
          <Boton variante="primario" onClick={guardar} disabled={!queja || guardando || !Object.keys(cambios).length}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Boton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Buzon({ idEmpresa, empresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const b = useSWR(ruta("/buzon", idEmpresa), get, { shouldRetryOnError: false });
  const [abierta, setAbierta] = useState(null);
  const [filtro, setFiltro] = useState("abiertas");
  if (b.error)
    return codigoDe(b.error) === "SIN_MIGRACION" ? (
      <Vacio titulo="Falta preparar la base de datos" texto="El buzón confidencial necesita la migración 20261220. Pídesela a soporte." />
    ) : (
      <Vacio titulo="No se pudo cargar el buzón" texto={errorDe(b.error)} />
    );
  if (!b.data) return <Cargando />;
  const url = urlBuzon(typeof window === "undefined" ? "" : window.location.origin, b.data.ruta);
  const compartir = textoCompartirBuzon(empresa, url);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      enqueueSnackbar("Liga copiada.", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo copiar. Selecciónala y cópiala a mano.", { variant: "warning" });
    }
  };
  const lista = b.data.quejas.filter((q) => (filtro === "abiertas" ? q.estado !== "cerrada" : true));
  return (
    <div className="space-y-4">
      <Tarjeta titulo="Liga del buzón confidencial">
        <p className="text-[13.5px] text-slate-700">
          Compártela con todo el personal (WhatsApp, cartel con QR, correo). Cualquiera puede contar lo que pasó <strong>sin dar su nombre</strong> y recibe un
          folio para ver cómo va. No se guarda su IP ni su usuario.
        </p>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-slate-100 px-3 py-2.5 text-[13px] text-slate-800" title={url}>
            {url}
          </code>
          <Boton onClick={copiar}>Copiar liga</Boton>
          <a
            href={ligaWhatsapp(compartir)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-green-300 bg-green-50 px-4 text-sm font-semibold text-green-800 hover:bg-green-100"
          >
            Compartir por WhatsApp
          </a>
        </div>
      </Tarjeta>
      <Tarjeta
        titulo="Quejas y denuncias"
        accion={
          <select aria-label="Filtrar quejas" className={`${CAMPO} w-auto`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="abiertas">Sin cerrar</option>
            <option value="todas">Todas</option>
          </select>
        }
      >
        {!lista.length ? (
          <p className="text-[13.5px] text-slate-600">{b.data.quejas.length ? "No hay quejas sin cerrar." : "Aún no se ha recibido ninguna queja."}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lista.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setAbierta(q.id)}
                  className="flex min-h-11 w-full flex-wrap items-center gap-2 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="w-28 shrink-0 font-mono text-[13px] font-bold text-slate-800">{q.folio}</span>
                  <span className="min-w-0 flex-1 text-[14px] text-slate-800">
                    {TIPOS_QUEJA[q.tipo]}
                    <span className="block text-[13px] text-slate-500">
                      {fechaCorta(q.recibida_el)} · {q.identificada ? "con datos de contacto" : "anónima"}
                      {q.centro ? ` · ${q.centro}` : ""}
                    </span>
                  </span>
                  <ChipEstado estado={q.estado} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Aviso tono="alerta">Atiende cada denuncia sin represalias contra quien la presenta, y registra lo que hiciste en la respuesta o en la nota.</Aviso>
        </div>
      </Tarjeta>
      <Detalle idEmpresa={idEmpresa} id={abierta} alCerrar={() => setAbierta(null)} alCambiar={() => b.mutate()} />
    </div>
  );
}
