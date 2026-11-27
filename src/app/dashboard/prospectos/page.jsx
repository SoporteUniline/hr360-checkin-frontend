"use client";

// Prospectos del pop-up y de /contacto (solo administradores de ADAMIA). Backend: /api/checador/prospectos
// (docs/prospectos.md). Es una página, no una ventana (docs/vistas-de-detalle.md). Letra de 16 px o más, títulos en 700,
// botones de 48 px con texto y sin degradados: la usa también gente mayor.
import { useEffect, useState } from "react";
import useSWR from "swr";
import Cookies from "js-cookie";
import { enqueueSnackbar } from "notistack";
import { fetcherWithToken } from "@/lib/fetcher";
import { celularLegible, consultaProspectos, fechaCorta, textoOrigen, valorOrigen } from "@/lib/prospectos/reglas.mjs";

const API = `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}/checador/prospectos`;
const CAMPO = "h-12 w-full rounded-xl border border-[#C7CEDD] bg-white px-4 text-base text-[#0B1033] outline-none focus-visible:border-[#2C56E8] focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/30";
const BOTON = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/40 disabled:cursor-not-allowed disabled:opacity-60";

function Noticias({ si }) {
  return si ? (
    <span data-chico className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-[#DCFCE7] px-3 py-1 text-[15px] font-bold text-[#166534]">Sí acepta</span>
  ) : (
    <span data-chico className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-[#F1F5F9] px-3 py-1 text-[15px] font-bold text-[#374151]">No</span>
  );
}

export default function ProspectosPage() {
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState("");
  const [noticias, setNoticias] = useState("");
  const [origen, setOrigen] = useState("");
  const [pagina, setPagina] = useState(1);
  const [incluirTodos, setIncluirTodos] = useState(false);
  const [descargando, setDescargando] = useState(false);

  // El buscador espera a que dejes de escribir (no consulta en cada letra).
  useEffect(() => {
    const t = window.setTimeout(() => { setBuscar(texto); setPagina(1); }, 350);
    return () => window.clearTimeout(t);
  }, [texto]);

  const filtros = { buscar, noticias, origen, pagina };
  const { data, error, isLoading } = useSWR(`/checador/prospectos${consultaProspectos(filtros)}`, fetcherWithToken, { keepPreviousData: true });
  const prospectos = data?.prospectos ?? [];
  const total = data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / (data?.por_pagina || 50)));
  const mensajeError = error?.response?.data?.error || error?.message;

  const descargar = async () => {
    setDescargando(true);
    try {
      const r = await fetch(`${API}/csv${consultaProspectos({ buscar, noticias, origen, todos: incluirTodos }, { csv: true })}`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "No se pudo descargar el archivo.");
      const nombre = /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1] || "prospectos.csv";
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      enqueueSnackbar(e.message, { variant: "error" });
    } finally {
      setDescargando(false);
    }
  };

  const cambiar = (set) => (e) => { set(e.target.value); setPagina(1); };

  return (
    <div data-pagina="prospectos" className="grid gap-6 text-base text-[#0B1033]">
      <header className="grid gap-1">
        <h1 className="text-[1.75rem] font-bold leading-tight">Prospectos</h1>
        <p className="text-[#4B5563]">Personas que dejaron sus datos en los pop-ups de la página o en Contacto.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Resumen">
        {[["Prospectos", data?.resumen?.total], ["Aceptan recibir noticias", data?.resumen?.con_noticias]].map(([t, v]) => (
          <div key={t} className="rounded-2xl border border-[#D8DEEB] bg-white p-5">
            <p className="text-[#4B5563]">{t}</p>
            <p className="text-[2rem] font-bold leading-tight">{v == null ? "—" : Number(v).toLocaleString("es-MX")}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl border border-[#D8DEEB] bg-white p-5" aria-label="Buscar y filtrar">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="grid gap-2">
            <span className="font-bold">Buscar</span>
            <input type="search" className={CAMPO} placeholder="Nombre, correo o celular" value={texto} maxLength={100} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="font-bold">Aceptó noticias</span>
            <select className={CAMPO} value={noticias} onChange={cambiar(setNoticias)}>
              <option value="">Todos</option>
              <option value="1">Sí aceptó</option>
              <option value="0">No aceptó</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="font-bold">Origen</span>
            <select className={CAMPO} value={origen} onChange={cambiar(setOrigen)}>
              <option value="">Todos</option>
              {(data?.origenes ?? []).map((o) => (
                <option key={valorOrigen(o)} value={valorOrigen(o)}>{`${textoOrigen(o)} (${o.total})`}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t border-[#E5E9F2] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="csv-todos" className="flex cursor-pointer items-start gap-3 text-[#374151]">
            <input id="csv-todos" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#2C56E8]" checked={incluirTodos} onChange={(e) => setIncluirTodos(e.target.checked)} />
            <span>Incluir en el archivo a quienes no aceptaron noticias</span>
          </label>
          <button type="button" onClick={descargar} disabled={descargando} className={`${BOTON} bg-[#2C56E8] text-white hover:bg-[#1F44C8]`}>
            {descargando ? "Descargando…" : incluirTodos ? "Descargar CSV (todos)" : "Descargar CSV (aceptan noticias)"}
          </button>
        </div>
      </section>

      {isLoading && !data ? (
        <p className="rounded-2xl border border-[#D8DEEB] bg-white p-6 text-[#4B5563]" role="status">Cargando prospectos…</p>
      ) : error ? (
        <p role="alert" className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 font-bold text-[#991B1B]">{mensajeError || "No se pudieron cargar los prospectos."}</p>
      ) : prospectos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C7CEDD] bg-white p-10 text-center">
          <p className="font-bold">{buscar || noticias || origen ? "Nadie coincide con la búsqueda." : "Aún no hay prospectos."}</p>
          <p className="text-[#4B5563]">Aparecen aquí cuando alguien deja sus datos en un pop-up o en Contacto.</p>
        </div>
      ) : (
        <>
          {/* Escritorio y tableta: tabla. Encabezados en 16 px con estilo en línea: globals.css los fija en 12.5 px fuera de @layer. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[#D8DEEB] bg-white md:block">
            <table className="w-full text-left text-base">
              <thead className="bg-[#F5F7FB] text-[#374151]">
                <tr>
                  {["Nombre", "Celular", "Correo", "Origen", "Fecha", "Noticias"].map((t) => <th key={t} scope="col" className="px-4 py-3 font-bold" style={{ fontSize: 16 }}>{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {prospectos.map((p) => (
                  <tr key={p.id} className="border-t border-[#E5E9F2] align-top">
                    <td className="px-4 py-3 font-bold break-words">{p.nombre}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{celularLegible(p.celular)}</td>
                    <td className="px-4 py-3 break-all">{p.correo || "—"}</td>
                    <td className="px-4 py-3 break-words">{textoOrigen(p)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fechaCorta(p.creado_en)}</td>
                    <td className="px-4 py-3"><Noticias si={p.acepta_noticias} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Celular: una tarjeta por persona. */}
          <ul className="grid gap-3 md:hidden" aria-label="Prospectos">
            {prospectos.map((p) => (
              <li key={p.id} className="grid gap-2 rounded-2xl border border-[#D8DEEB] bg-white p-4 text-[17px]">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-bold break-words">{p.nombre}</p>
                  <Noticias si={p.acepta_noticias} />
                </div>
                <p>{p.celular ? celularLegible(p.celular) : "Sin celular"}</p>
                <p className="break-all">{p.correo || "Sin correo"}</p>
                <p className="text-[#374151] break-words">{textoOrigen(p)} · {fechaCorta(p.creado_en)}</p>
              </li>
            ))}
          </ul>
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Páginas">
            <p className="text-[#374151]">{`${total.toLocaleString("es-MX")} en total · página ${pagina} de ${paginas}`}</p>
            <div className="flex gap-3">
              <button type="button" className={`${BOTON} border-2 border-[#2C56E8] bg-white text-[#2C56E8]`} disabled={pagina <= 1} onClick={() => setPagina((n) => n - 1)}>Anterior</button>
              <button type="button" className={`${BOTON} border-2 border-[#2C56E8] bg-white text-[#2C56E8]`} disabled={pagina >= paginas} onClick={() => setPagina((n) => n + 1)}>Siguiente</button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
