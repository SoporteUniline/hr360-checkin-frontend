"use client";
// Bolsa de trabajo pública v2 (maqueta aprobada por el dueño, 27/11/2026): «muy fácil, que hasta una persona de 60 años
// se pueda postular y fácil de leer». Buscador grande (puesto + lugar), chips de un toque, y en computadora lista a la
// izquierda + vacante elegida a la derecha (?v=slug, sin recargar); en celular la lista abre la página de la vacante.
// API: /vacantes/filter (lo de antes + parámetros nuevos, ver src/lib/bolsaTrabajo.mjs), /vacantes/entidades,
// /empresas/activas?bolsa=1 (solo empresas que publican en la bolsa) y /vacantes/slug/:slug para la vacante elegida.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { MapPin, Search } from "lucide-react";
import { fetcher, swr_config } from "@/lib/fetcher";
import {
  FILTROS_INICIALES, LIMITE_VACANTES, ORDENES, aplicarUbicacion, cambiarFiltro, consultaVacantes, cuantosFiltros, filtrosActivos, filtrosDesdeUrl,
  hayFiltros, opcionesUbicacion, textoConteo, textoDe, totalPaginas, ubicacionValida, urlDeFiltros, vacanteDeUrl, valorUbicacion,
} from "@/lib/bolsaTrabajo.mjs";
import ListaVacantes, { Esqueletos, Estado } from "./ListaVacantes";
import { ChipsCelular, ChipsEscritorio, HojaFiltros, Paginacion } from "./Filtros";
import FichaVacante from "../vacante/[slug]/FichaVacante";

// Solo las empresas que publican en la bolsa y tienen vacantes abiertas (filtra el backend).
export const RUTA_EMPRESAS_BOLSA = "/empresas/activas?bolsa=1&limit=50&page=1";

// Vacante elegida (escritorio): se ve al momento con los datos de la lista y se completa con su página (preguntas,
// periodo de postulación) antes de ofrecer postularse.
function PanelVacante({ fila }) {
  const { data, error } = useSWR(fila ? `/vacantes/slug/${encodeURIComponent(fila.slug)}` : null, fetcher, swr_config);
  if (!fila) return null;
  const v = data?.slug === fila.slug ? { ...fila, ...data } : fila;
  return (
    <div className="bt2-panel-in" key={fila.slug}>
      {error ? <p className="bt2-nota" role="status">No pudimos cargar todos los datos de esta vacante. <Link href={`/vacante/${encodeURIComponent(fila.slug)}`}>Abrir su página</Link></p> : null}
      <FichaVacante v={v} nivel="h2" completo={Boolean(data) && !error} />
      <p className="bt2-panel-pagina"><Link href={`/vacante/${encodeURIComponent(fila.slug)}`}>Abrir la página de esta vacante</Link></p>
    </div>
  );
}

// ¿Pantalla de computadora (≥ 1024 px)? Solo ahí se arma el panel de la derecha (en celular no se piden sus datos).
function useEscritorio() {
  const [escritorio, setEscritorio] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const ver = () => setEscritorio(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);
  return escritorio;
}

export default function BolsaTrabajo() {
  const escritorio = useEscritorio();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [elegida, setElegida] = useState("");
  const [listo, setListo] = useState(false);
  const [texto, setTexto] = useState("");
  const [hoja, setHoja] = useState(false);
  const [ubicacion, setUbicacion] = useState(null);
  const [avisoUbicacion, setAvisoUbicacion] = useState("");
  const tituloRes = useRef(null);

  useEffect(() => {
    const f = filtrosDesdeUrl(window.location.search);
    setFiltros(f);
    setTexto(f.titulo);
    setElegida(vacanteDeUrl(window.location.search));
    setListo(true);
  }, []);

  // La dirección refleja la búsqueda y la vacante elegida (sin recargar ni crear historial).
  useEffect(() => {
    if (!listo) return;
    const destino = `${window.location.pathname}${urlDeFiltros(filtros, elegida)}`;
    if (destino !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", destino);
  }, [filtros, elegida, listo]);

  // Búsqueda por puesto mientras se escribe (con pausa); «Buscar» o Enter la aplica al momento.
  useEffect(() => {
    if (!listo) return undefined;
    const t = setTimeout(() => setFiltros((f) => (f.titulo === texto.trim() ? f : cambiarFiltro(f, "titulo", texto.trim()))), 450);
    return () => clearTimeout(t);
  }, [texto, listo]);

  const clave = listo ? `/vacantes/filter?${consultaVacantes(filtros, LIMITE_VACANTES, ubicacion)}` : null;
  const { data, error, isValidating, mutate } = useSWR(clave, fetcher, { ...swr_config, keepPreviousData: true });
  const { data: ubic } = useSWR("/vacantes/entidades", fetcher, swr_config);
  const { data: datosEmpresas } = useSWR(RUTA_EMPRESAS_BOLSA, fetcher, swr_config);

  const empresas = useMemo(() => (Array.isArray(datosEmpresas?.data) ? datosEmpresas.data : []), [datosEmpresas]);
  const nombres = useMemo(() => Object.fromEntries(empresas.map((e) => [String(e.id_empresa), e.nombre_empresa])), [empresas]);
  const ubicaciones = useMemo(() => opcionesUbicacion(ubic?.entidades, ubic?.ciudades), [ubic]);

  const total = Number(data?.total) || 0;
  const vacantes = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);
  const paginasTotales = totalPaginas(total, LIMITE_VACANTES);
  const conFiltros = hayFiltros(filtros);
  const cuantos = cuantosFiltros(filtros);
  const cargando = !data && !error;
  // En escritorio se ve la elegida o, si no hay, la primera de la lista.
  const filaElegida = vacantes.find((v) => v.slug === elegida) || vacantes[0] || null;

  const cambiar = useCallback((k, valor) => setFiltros((f) => cambiarFiltro(f, k, valor)), []);
  // «Más cerca de mí» pide la ubicación del navegador (solo al tocarlo). Si no se puede, se queda como estaba y se avisa.
  const ordenar = useCallback((valor) => {
    setAvisoUbicacion("");
    if (valor !== "cerca") return setFiltros((f) => cambiarFiltro(f, "orden", valor));
    if (ubicacionValida(ubicacion)) return setFiltros((f) => cambiarFiltro(f, "orden", "cerca"));
    if (!navigator.geolocation) return setAvisoUbicacion("Tu navegador no comparte la ubicación. Elige tu estado o ciudad en «Lugar».");
    setAvisoUbicacion("Buscando dónde estás…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUbicacion({ lat: p.coords.latitude, lng: p.coords.longitude });
        setAvisoUbicacion("");
        setFiltros((f) => cambiarFiltro(f, "orden", "cerca"));
      },
      () => setAvisoUbicacion("No pudimos saber dónde estás. Revisa el permiso de ubicación o elige tu estado o ciudad en «Lugar»."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }, [ubicacion]);

  const limpiar = () => {
    setFiltros(FILTROS_INICIALES);
    setTexto("");
    setAvisoUbicacion("");
  };
  const irAPagina = (p) => {
    setFiltros((f) => ({ ...f, page: Math.min(Math.max(1, p), paginasTotales) }));
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tituloRes.current?.scrollIntoView({ behavior: reducir ? "auto" : "smooth", block: "start" });
    tituloRes.current?.focus({ preventScroll: true });
  };
  const buscar = (e) => {
    e.preventDefault();
    setFiltros((f) => cambiarFiltro(f, "titulo", texto.trim()));
  };
  const elegir = (slug) => setElegida(slug);

  let conteo = "Buscando vacantes…";
  if (data) conteo = textoConteo(total, conFiltros);
  else if (error) conteo = "";

  let contenido;
  if (cargando) {
    contenido = <Esqueletos />;
  } else if (error) {
    contenido = (
      <Estado tipo="error" titulo="No pudimos cargar las vacantes" accion={<button type="button" className="bt2-btn principal" onClick={() => mutate()}>Reintentar</button>}>
        Revisa tu conexión a internet e inténtalo de nuevo.
      </Estado>
    );
  } else if (!vacantes.length) {
    contenido = conFiltros ? (
      <Estado tipo="vacio-filtros" titulo="No hay vacantes con esos filtros" accion={<button type="button" className="bt2-btn principal" onClick={limpiar}>Limpiar filtros</button>}>
        Prueba con otro puesto, otro lugar o quita algún filtro.
      </Estado>
    ) : (
      <Estado tipo="vacio" titulo="Por ahora no hay vacantes publicadas">
        Vuelve más tarde: aquí aparecen en cuanto una empresa publica una vacante.
      </Estado>
    );
  } else {
    contenido = (
      <>
        <ListaVacantes vacantes={vacantes} actualizando={isValidating} elegida={escritorio ? filaElegida?.slug : undefined} onElegir={elegir} />
        <Paginacion actual={Math.min(filtros.page, paginasTotales)} total={paginasTotales} onIr={irAPagina} />
      </>
    );
  }

  const activos = filtrosActivos(filtros, nombres);
  const ordenTexto = textoDe(ORDENES, filtros.orden);

  return (
    <div className="bt2 bt2-bolsa">
      <section className="bt2-buscar-banda" aria-labelledby="bt2-titulo">
        <div className="bt2-envoltura ancha">
          <h1 id="bt2-titulo" className="bt2-titulo">Bolsa de trabajo</h1>
          <form className="bt2-buscar" role="search" aria-label="Buscar vacantes" onSubmit={buscar}>
            <label className="bt2-buscar-campo puesto">
              <span className="sr-only">Puesto</span>
              <Search aria-hidden="true" />
              <input type="search" name="q" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué trabajo buscas? Ej. cajera, chofer"
                autoComplete="off" enterKeyHint="search" maxLength={120} />
            </label>
            <label className="bt2-buscar-campo lugar">
              <span className="sr-only">Lugar</span>
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
            </label>
            <button type="submit" className="bt2-btn principal bt2-buscar-btn">Buscar</button>
          </form>
          <div className="solo-escritorio">
            <ChipsEscritorio filtros={filtros} empresas={empresas} onCambiar={cambiar} onOrden={ordenar} ordenTexto={ordenTexto} onLimpiar={limpiar} hayAlgo={conFiltros || Boolean(filtros.orden)} />
          </div>
          <div className="solo-movil">
            <ChipsCelular filtros={filtros} cuantos={cuantos} onAbrir={() => setHoja(true)} onCambiar={cambiar} onOrden={ordenar} />
          </div>
          <p className="bt2-aviso-ubicacion" role="status">{avisoUbicacion}</p>
        </div>
      </section>

      <div className="bt2-envoltura ancha bt2-cuerpo">
        <section className="bt2-resultados" aria-labelledby="bt2-res-titulo">
          <div className="bt2-res-cab">
            <h2 id="bt2-res-titulo" ref={tituloRes} tabIndex={-1} className="sr-only">Vacantes</h2>
            <p className="bt2-conteo" aria-live="polite">
              {data ? <b>{conteo}</b> : <span>{conteo}</span>}
              {data && paginasTotales > 1 ? <span>, página {Math.min(filtros.page, paginasTotales)} de {paginasTotales}</span> : null}
            </p>
          </div>
          {activos.length ? (
            <ul className="bt2-activos" aria-label="Filtros aplicados">
              {activos.map((a) => (
                <li key={a.clave}>
                  <button type="button" className="bt2-quitar" onClick={() => { if (a.clave === "titulo") setTexto(""); cambiar(a.clave, ""); }} aria-label={`Quitar filtro ${a.etiqueta}`}>
                    {a.etiqueta} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {contenido}
          <p className="bt2-empresas-cta">¿Tu empresa contrata? <Link href="/contacto">Publica tus vacantes con ADAMIA</Link></p>
        </section>

        <section className="bt2-panel" aria-label="Vacante elegida" data-panel-vacante={filaElegida?.slug || ""}>
          {escritorio && filaElegida ? <PanelVacante fila={filaElegida} /> : null}
          <p className="sr-only" aria-live="polite">{filaElegida && elegida ? `Mostrando la vacante ${filaElegida.titulo}` : ""}</p>
        </section>
      </div>

      <HojaFiltros abierta={hoja} onAbierta={setHoja} filtros={filtros} empresas={empresas} total={data ? total : undefined}
        onCambiar={cambiar} onOrden={ordenar} onLimpiar={limpiar} />
    </div>
  );
}
