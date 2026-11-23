"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { fetcher, swr_config } from "@/lib/fetcher";
import {
  FILTROS_INICIALES, LIMITE_VACANTES, aplicarUbicacion, cambiarFiltro, consultaVacantes, filtrosActivos, filtrosDesdeUrl,
  hayFiltros, opcionesUbicacion, quitarFiltro, textoConteo, totalPaginas, urlDeFiltros, valorUbicacion,
} from "@/lib/bolsaTrabajo.mjs";
import EmpresasContratando, { RUTA_EMPRESAS_BOLSA } from "./EmpresasContratando";
import ListaVacantes, { Esqueletos, Estado } from "./ListaVacantes";
import { GruposFiltros, HojaFiltros, Paginacion } from "./Filtros";

const Flecha = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// Bolsa de trabajo pública (rediseño 23/11/2026). Contratos del API sin cambios: /vacantes/filter (misma consulta),
// /vacantes/entidades, /empresas/giros y /empresas/activas?bolsa=1&limit=4&page=1. Los filtros viven en la dirección
// (?q=…&estado=…) para compartir la búsqueda y volver de una vacante sin perderla.
export default function BolsaTrabajo() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [listo, setListo] = useState(false);
  const [texto, setTexto] = useState("");
  const [hoja, setHoja] = useState(false);
  const tituloRes = useRef(null);

  useEffect(() => {
    const f = filtrosDesdeUrl(window.location.search);
    setFiltros(f);
    setTexto(f.titulo);
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    const destino = `${window.location.pathname}${urlDeFiltros(filtros)}`;
    if (destino !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", destino);
  }, [filtros, listo]);

  // Búsqueda por puesto mientras se escribe (como antes, con pausa); «Buscar» o Enter la aplica al momento.
  useEffect(() => {
    if (!listo) return undefined;
    const t = setTimeout(() => setFiltros((f) => (f.titulo === texto.trim() ? f : cambiarFiltro(f, "titulo", texto.trim()))), 450);
    return () => clearTimeout(t);
  }, [texto, listo]);

  const clave = listo ? `/vacantes/filter?${consultaVacantes(filtros)}` : null;
  const { data, error, isValidating, mutate } = useSWR(clave, fetcher, { ...swr_config, keepPreviousData: true });
  const { data: ubic } = useSWR("/vacantes/entidades", fetcher, swr_config);
  const { data: datosGiros } = useSWR("/empresas/giros", fetcher, swr_config);
  const { data: datosEmpresas, isLoading: cargandoEmpresas } = useSWR(RUTA_EMPRESAS_BOLSA, fetcher, swr_config);

  const empresas = useMemo(() => datosEmpresas?.data ?? [], [datosEmpresas]);
  const nombres = useMemo(() => Object.fromEntries(empresas.map((e) => [String(e.id_empresa), e.nombre_empresa])), [empresas]);
  const ubicaciones = useMemo(() => opcionesUbicacion(ubic?.entidades, ubic?.ciudades), [ubic]);
  const giros = Array.isArray(datosGiros?.giros) ? datosGiros.giros.filter(Boolean) : [];
  const paises = Array.isArray(ubic?.paises) ? ubic.paises.filter(Boolean) : [];

  const activos = filtrosActivos(filtros, nombres);
  const conFiltros = hayFiltros(filtros);
  const enHoja = ["tipo_contratacion", "giro", "pais"].filter((k) => filtros[k]).length;
  const total = Number(data?.total) || 0;
  const vacantes = Array.isArray(data?.data) ? data.data : [];
  const paginasTotales = totalPaginas(total, LIMITE_VACANTES);
  const cargando = !data && !error;

  const cambiar = useCallback((clave, valor) => setFiltros((f) => cambiarFiltro(f, clave, valor)), []);
  const limpiar = () => {
    setFiltros(FILTROS_INICIALES);
    setTexto("");
  };
  const quitar = (clave) => {
    if (clave === "titulo") setTexto("");
    setFiltros((f) => quitarFiltro(f, clave));
  };
  const irAPagina = (p) => {
    setFiltros((f) => ({ ...f, page: Math.min(Math.max(1, p), paginasTotales) }));
    tituloRes.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    tituloRes.current?.focus({ preventScroll: true });
  };
  const buscar = (e) => {
    e.preventDefault();
    setFiltros((f) => cambiarFiltro(f, "titulo", texto.trim()));
    tituloRes.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  let conteo = "Buscando vacantes…";
  if (data) conteo = textoConteo(total, conFiltros);
  else if (error) conteo = "";

  let contenido;
  if (cargando) {
    contenido = <Esqueletos />;
  } else if (error) {
    contenido = (
      <Estado tipo="error" titulo="No pudimos cargar las vacantes" accion={<button type="button" className="btn btn-primary" onClick={() => mutate()}>Reintentar</button>}>
        Revisa tu conexión a internet e inténtalo de nuevo.
      </Estado>
    );
  } else if (!vacantes.length) {
    contenido = conFiltros ? (
      <Estado tipo="vacio-filtros" titulo="No hay vacantes con esos filtros" accion={<button type="button" className="btn btn-primary" onClick={limpiar}>Limpiar filtros</button>}>
        Prueba con otro puesto, otra ubicación o quita algún filtro.
      </Estado>
    ) : (
      <Estado tipo="vacio" titulo="Por ahora no hay vacantes publicadas">
        Vuelve más tarde: aquí aparecen en cuanto una empresa publica una vacante.
      </Estado>
    );
  } else {
    contenido = (
      <>
        <ListaVacantes vacantes={vacantes} actualizando={isValidating} />
        <Paginacion actual={Math.min(filtros.page, paginasTotales)} total={paginasTotales} onIr={irAPagina} />
      </>
    );
  }

  const grupos = (idBase) => <GruposFiltros idBase={idBase} filtros={filtros} giros={giros} paises={paises} onCambiar={cambiar} />;

  return (
    <>
      <section className="bt-hero" aria-labelledby="bt-titulo">
        <div className="wrap bt-hero-in">
          <span className="eyebrow">Bolsa de trabajo</span>
          <h1 id="bt-titulo">Encuentra tu próximo trabajo</h1>
          <p className="lead">Vacantes de empresas en México que contratan con ADAMIA. Postúlate desde tu celular en minutos, sin crear una cuenta.</p>
        </div>
      </section>

      <div className="wrap bt-buscar-caja">
        <form className="bt-buscar" role="search" aria-label="Buscar vacantes" onSubmit={buscar}>
          <label className="bt-campo">
            <span>Puesto</span>
            <span className="bt-control">
              <Search aria-hidden="true" />
              <input type="search" name="q" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. chofer, cajera, almacén" autoComplete="off" enterKeyHint="search" maxLength={120} />
            </span>
          </label>
          <label className="bt-campo">
            <span>Estado o ciudad</span>
            <span className="bt-control">
              <MapPin aria-hidden="true" />
              <select name="ubicacion" value={valorUbicacion(filtros)} onChange={(e) => setFiltros((f) => aplicarUbicacion(f, e.target.value))}>
                <option value="">Todo México</option>
                {ubicaciones.estados.length ? (
                  <optgroup label="Estados">
                    {ubicaciones.estados.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                  </optgroup>
                ) : null}
                {ubicaciones.ciudades.length ? (
                  <optgroup label="Ciudades">
                    {ubicaciones.ciudades.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                  </optgroup>
                ) : null}
              </select>
            </span>
          </label>
          <button type="submit" className="btn btn-primary">Buscar</button>
        </form>
        <p className="bt-conteo" aria-live="polite">
          {data ? <b>{conteo}</b> : <span>{conteo}</span>}
          {data && !conFiltros && ubicaciones.estados.length > 1 ? <span>en {ubicaciones.estados.length} estados</span> : null}
        </p>
      </div>

      <EmpresasContratando
        empresas={empresas}
        cargando={cargandoEmpresas}
        idEmpresa={filtros.id_empresa}
        onElegir={(id) => cambiar("id_empresa", id)}
      />

      <section className="bt-res" aria-labelledby="bt-res-titulo">
        <div className="wrap bt-res-grid">
          <aside className="bt-lateral" aria-label="Filtros">
            <h2>Filtrar vacantes</h2>
            {grupos("lat")}
          </aside>
          <div>
            <div className="bt-res-cab">
              <div>
                <h2 id="bt-res-titulo" ref={tituloRes} tabIndex={-1}>Vacantes</h2>
                {data ? <p>{conteo}{paginasTotales > 1 ? `, página ${Math.min(filtros.page, paginasTotales)} de ${paginasTotales}` : ""}</p> : null}
              </div>
              <button type="button" className="btn btn-line bt-btn-filtros" onClick={() => setHoja(true)} aria-haspopup="dialog">
                <SlidersHorizontal aria-hidden="true" size={18} /> Filtros {enHoja ? <b aria-label={`${enHoja} aplicados`}>{enHoja}</b> : null}
              </button>
            </div>
            {activos.length ? (
              <ul className="bt-activos" aria-label="Filtros aplicados">
                {activos.map((a) => (
                  <li key={a.clave}>
                    <button type="button" className="bt-chip" onClick={() => quitar(a.clave)} aria-label={`Quitar filtro ${a.etiqueta}`}>
                      {a.etiqueta} <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
                <li><button type="button" className="bt-texto-btn" onClick={limpiar}>Limpiar filtros</button></li>
              </ul>
            ) : null}
            {contenido}
          </div>
        </div>
      </section>

      <section className="bt-cta" aria-labelledby="bt-cta-titulo">
        <div className="wrap">
          <div className="solid violet">
            <div>
              <h2 id="bt-cta-titulo">¿Tu empresa contrata? Publica tus vacantes con ADAMIA.</h2>
              <p>Recibe postulaciones con teléfono verificado, haz tus propias preguntas de filtro y lleva cada candidato hasta su contratación desde el mismo panel de Recursos Humanos.</p>
            </div>
            <div className="ctas">
              <Link className="btn btn-primary" href="/contacto">Solicitar demo <Flecha /></Link>
              <Link className="btn btn-claro" href="/contratar-plan">Contratar</Link>
            </div>
          </div>
        </div>
      </section>

      <HojaFiltros abierta={hoja} onAbierta={setHoja} total={data ? total : undefined} onLimpiar={limpiar}>
        {grupos("hoja")}
      </HojaFiltros>
    </>
  );
}
