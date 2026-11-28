"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { filtrarOpciones, moverActiva, opcionesParaMostrar, puedeOfrecerCrear } from "@/lib/formulario/listaConBuscador.mjs";

/**
 * Lista desplegable CON BUSCADOR (28/11/2026, pedido del dueño; docs/sistema-diseno.md). Para toda lista de más de 7
 * opciones o que viene de un catálogo (persona, jefe, puesto, departamento, lugar de trabajo). Las listas cortas y fijas
 * (modalidad, moneda) siguen con `Lista` (nativa).
 *   - Escribes y filtra sin importar acentos ni mayúsculas («almacen» encuentra «Jefa de Almacén»).
 *   - Teclado: ↓ ↑ para moverte, Enter para elegir, Esc para cerrar; sobre el botón, ↓ / Enter / espacio la abren y
 *     escribir una letra la abre ya buscando esa letra.
 *   - Si es un catálogo y se puede crear (`alCrear`), cuando lo escrito no existe aparece «+ Crear "texto"»: quien la
 *     usa abre una VentanaChica para darlo de alta y, al guardar, lo deja elegido (lo capturado no se pierde).
 *   - Un valor guardado que ya no está en el catálogo (un contrato viejo) se ve como «Vendedorx (no está en el
 *     catálogo)» y se conserva: no se borra solo.
 *   - En celular la lista mide lo que el campo (mínimo 280 px) y los renglones son de 48 px para el dedo.
 * Las reglas (filtrar, «Crear», fuera de catálogo, flechas) son puras: src/lib/formulario/listaConBuscador.mjs, con
 * pruebas en scripts/test-lista-buscador.mjs.
 *
 * Va dentro de CampoFormulario (recibe id, className, aria-* y data-variante del campo):
 *   <CampoFormulario id="ct-puesto" etiqueta="Puesto">
 *     {(p) => <ListaConBuscador {...p} opciones={[{ value: "Cajera", label: "Cajera" }]} valor={puesto} onCambio={setPuesto}
 *       vacio="Elige el puesto" buscar="Buscar puesto…" alCrear={(texto) => abrirAlta(texto)} />}
 *   </CampoFormulario>
 *
 * Props:
 *   opciones   [{ value, label, detalle? }] (detalle: una línea gris debajo, p. ej. el puesto de la persona; también se busca ahí).
 *   valor      el value elegido ("" = nada). onCambio(value).
 *   vacio      texto cuando no hay nada elegido («Elige a la persona»).
 *   opcionVacia  texto de una opción para dejarlo vacío («Sin jefe directo»), o null.
 *   buscar     texto del buscador («Buscar puesto…»).
 *   alCrear    (texto) => void. Si viene, ofrece «+ Crear "texto"». Sin él (sin permiso), no se ofrece.
 *   sinResultados  texto cuando nada coincide (por omisión «No hay coincidencias»).
 *   cargando   muestra «Cargando…» en la lista.
 *   disabled   como en un <select>.
 * Deja data-lista-buscador y data-valor en el botón para las pruebas.
 */
export default function ListaConBuscador({
  opciones = [],
  valor = "",
  onCambio = () => {},
  vacio = "Elige una opción",
  opcionVacia = null,
  buscar = "Buscar…",
  alCrear = null,
  sinResultados = "No hay coincidencias",
  cargando = false,
  disabled = false,
  className = "",
  id,
  ...props
}) {
  const [abierta, setAbierta] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activa, setActiva] = useState(-1);
  const lista = useRef(null);
  const idLista = useId();
  const linea = props["data-variante"] === "linea";

  const todas = useMemo(() => opcionesParaMostrar(opciones, valor, { vacia: opcionVacia }), [opciones, valor, opcionVacia]);
  const visibles = useMemo(() => filtrarOpciones(todas, consulta), [todas, consulta]);
  const crear = alCrear && puedeOfrecerCrear(opciones, consulta, { sePuedeCrear: true });
  const total = visibles.length + (crear ? 1 : 0);
  const elegida = todas.find((o) => String(o.value) === String(valor ?? ""));
  const texto = valor ? elegida?.label ?? String(valor) : null;

  const abrir = (siguiente, semilla = "") => {
    setAbierta(siguiente);
    setConsulta(siguiente ? semilla : "");
    setActiva(siguiente ? Math.max(0, todas.findIndex((o) => String(o.value) === String(valor ?? ""))) : -1);
  };
  const elegir = (opcion) => {
    onCambio(String(opcion.value));
    abrir(false);
  };
  const pedirCrear = () => {
    const t = consulta.trim();
    abrir(false);
    alCrear?.(t);
  };
  const verActiva = (i) => lista.current?.querySelector(`[data-indice="${i}"]`)?.scrollIntoView({ block: "nearest" });

  const alTeclearBuscador = (e) => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) && total) {
      e.preventDefault();
      const i = moverActiva(activa, e.key, total);
      setActiva(i);
      verActiva(i);
    } else if (e.key === "Enter") {
      e.preventDefault(); // dentro de un <form> no debe mandarlo
      if (activa >= 0 && activa < visibles.length) elegir(visibles[activa]);
      else if (crear && (activa === visibles.length || !visibles.length)) pedirCrear();
    }
  };
  const alTeclearBoton = (e) => {
    if (disabled || abierta) return;
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      abrir(true);
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      abrir(true, e.key); // escribir sobre el botón abre ya buscando
    }
  };

  const idOpcion = (i) => `${idLista}-op-${i}`;
  return (
    <Popover open={abierta && !disabled} onOpenChange={(v) => abrir(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={abierta}
          aria-controls={abierta ? idLista : undefined}
          disabled={disabled}
          data-lista-buscador
          data-valor={valor ?? ""}
          onKeyDown={alTeclearBoton}
          {...props}
          className={cn(className, "flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed")}
        >
          <span className={cn("min-w-0 flex-1 truncate", !texto && "text-texto-deshabilitado")}>{texto ?? vacio}</span>
          <ChevronDown aria-hidden="true" className={cn("size-[18px] shrink-0 text-texto-secundario transition-transform", abierta && "rotate-180", linea && "mr-0.5")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={16}
        data-lista-buscador-menu
        className="w-[max(var(--radix-popover-trigger-width),280px)] max-w-[calc(100vw-32px)] overflow-hidden rounded-boton border border-borde bg-white p-0 text-cuerpo text-texto shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
      >
        <div className="relative border-b border-borde">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-texto-secundario" />
          <input
            type="text"
            role="searchbox"
            aria-label={buscar.replace(/…$/, "")}
            aria-controls={idLista}
            aria-activedescendant={activa >= 0 ? idOpcion(activa) : undefined}
            autoComplete="off"
            value={consulta}
            onChange={(e) => { setConsulta(e.target.value); setActiva(0); }}
            onKeyDown={alTeclearBuscador}
            placeholder={buscar}
            className="block h-12 w-full border-0 bg-transparent pl-10 pr-3 text-campo text-texto placeholder:text-texto-deshabilitado focus:outline-none lg:h-11"
          />
        </div>
        <ul ref={lista} id={idLista} role="listbox" aria-label={buscar.replace(/…$/, "")} className="m-0 max-h-[min(320px,50dvh)] list-none overflow-y-auto p-1">
          {cargando ? (
            <li className="flex items-center gap-2 px-3 py-3 text-texto-secundario"><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Cargando…</li>
          ) : null}
          {!cargando && !visibles.length && !crear ? <li className="px-3 py-3 text-texto-secundario" data-sin-resultados>{sinResultados}</li> : null}
          {visibles.map((o, i) => {
            const marcada = String(o.value) === String(valor ?? "") && (Boolean(valor) || o.vacia);
            return (
              <li
                key={`${o.value}-${i}`}
                id={idOpcion(i)}
                role="option"
                aria-selected={marcada}
                data-indice={i}
                data-valor={o.value}
                data-activa={activa === i || undefined}
                onMouseMove={() => activa !== i && setActiva(i)}
                onMouseDown={(e) => e.preventDefault()} // el foco se queda en el buscador
                onClick={() => elegir(o)}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2 rounded-[6px] px-3 py-1.5 lg:min-h-10",
                  activa === i && "bg-seleccion",
                  o.vacia || o.fueraDeCatalogo ? "text-texto-secundario" : "text-texto",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("break-words", marcada && "font-semibold")}>{o.label}</span>
                  {o.detalle ? <span data-chico className="text-[15px] text-texto-secundario">{o.detalle}</span> : null}
                </span>
                {marcada ? <Check aria-hidden="true" className="size-[18px] shrink-0 text-brand" /> : null}
              </li>
            );
          })}
          {crear ? (
            <li
              id={idOpcion(visibles.length)}
              role="option"
              aria-selected={false}
              data-indice={visibles.length}
              data-crear
              data-activa={activa === visibles.length || undefined}
              onMouseMove={() => activa !== visibles.length && setActiva(visibles.length)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={pedirCrear}
              className={cn("flex min-h-12 cursor-pointer items-center gap-2 rounded-[6px] px-3 py-1.5 font-semibold text-brand lg:min-h-10", visibles.length && "mt-1 border-t border-borde", activa === visibles.length && "bg-seleccion")}
            >
              <Plus aria-hidden="true" className="size-[18px] shrink-0" />
              <span className="min-w-0 break-words">Crear «{consulta.trim()}»</span>
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
