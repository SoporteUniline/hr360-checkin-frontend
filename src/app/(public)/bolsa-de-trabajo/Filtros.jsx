"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, SlidersHorizontal, X } from "lucide-react";
import { JORNADAS, MODALIDADES, ORDENES, PUBLICADAS, SUELDOS, paginas, textoDe, textoSueldoMin } from "@/lib/bolsaTrabajo.mjs";
import IconoWhatsApp from "@/components/IconoWhatsApp";

const opcionesSueldo = [{ valor: "", texto: "Cualquier sueldo" }, ...SUELDOS.map((n) => ({ valor: String(n), texto: textoSueldoMin(n) }))];
const conTodas = (lista, texto) => [{ valor: "", texto }, ...lista];

// Grupo de una sola elección: radios nativos con forma de botón grande (teclado y lector de pantalla incluidos).
// onElegido: al tocar una opción (clic o Espacio; las flechas solo cambian la selección), p. ej. para cerrar el menú.
export function Opciones({ nombre, leyenda, opciones, valor, onCambiar, idBase, oculta = false, onElegido }) {
  return (
    <fieldset className="bt2-grupo">
      <legend className={oculta ? "sr-only" : undefined}>{leyenda}</legend>
      <div className="bt2-opciones">
        {opciones.map((o) => (
          <label key={o.valor || "todas"} className="bt2-opcion">
            <input type="radio" name={`${idBase}-${nombre}`} value={o.valor} checked={valor === o.valor} onChange={() => onCambiar(nombre, o.valor)} onClick={onElegido} />
            <span>{o.texto}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Interruptor de un toque (Sin experiencia, Postúlate por WhatsApp): botón con aria-pressed.
function Alternar({ activo, onClick, children, className = "" }) {
  return (
    <button type="button" className={`bt2-chip${activo ? " activo" : ""} ${className}`} aria-pressed={activo} onClick={onClick}>
      {activo ? <Check aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

// Chip con menú (escritorio): muestra lo elegido; el menú tiene las opciones como botones grandes. Tocar una opción
// cierra el menú; Esc también (y el foco vuelve al chip).
function ChipMenu({ etiqueta, valorTexto, activo, children }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger className={`bt2-chip${activo ? " activo" : ""}`}>
        <span>{activo ? `${etiqueta}: ${valorTexto}` : etiqueta}</span>
        <ChevronDown aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="bt2 bt2-menu" align="start" sideOffset={8} collisionPadding={16} aria-label={etiqueta}>
          {children(() => setAbierto(false))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MenuOpciones({ nombre, leyenda, opciones, valor, onCambiar, cerrar }) {
  return <Opciones idBase="chip" nombre={nombre} leyenda={leyenda} opciones={opciones} valor={valor} onCambiar={onCambiar} onElegido={cerrar} />;
}

// Barra de chips de escritorio: ordenar, publicada, sueldo, modalidad, jornada, empresa, sin experiencia y WhatsApp.
export function ChipsEscritorio({ filtros, empresas, onCambiar, onOrden, ordenTexto, onLimpiar, hayAlgo }) {
  const nombreEmpresa = empresas.find((e) => String(e.id_empresa) === filtros.id_empresa)?.nombre_empresa || "Empresa elegida";
  return (
    <div className="bt2-chips" role="group" aria-label="Filtros">
      <ChipMenu etiqueta="Ordenar" valorTexto={ordenTexto} activo={Boolean(filtros.orden)}>
        {(cerrar) => (<>
        <MenuOpciones cerrar={cerrar} nombre="orden" leyenda="Ordenar por" opciones={ORDENES} valor={filtros.orden} onCambiar={(_, v) => onOrden(v)} />
      </>)}
      </ChipMenu>
      <ChipMenu etiqueta="Publicada" valorTexto={textoDe(PUBLICADAS, filtros.publicada).toLowerCase()} activo={Boolean(filtros.publicada)}>
        {(cerrar) => (<>
        <MenuOpciones cerrar={cerrar} nombre="publicada" leyenda="Publicada" opciones={PUBLICADAS} valor={filtros.publicada} onCambiar={onCambiar} />
      </>)}
      </ChipMenu>
      <ChipMenu etiqueta="Sueldo" valorTexto={textoSueldoMin(filtros.sueldo_min).toLowerCase()} activo={Boolean(filtros.sueldo_min)}>
        {(cerrar) => (<>
        <MenuOpciones cerrar={cerrar} nombre="sueldo_min" leyenda="Sueldo mensual" opciones={opcionesSueldo} valor={filtros.sueldo_min} onCambiar={onCambiar} />
        <p className="bt2-menu-nota">Solo cuentan las vacantes que publican su sueldo.</p>
      </>)}
      </ChipMenu>
      <ChipMenu etiqueta="Modalidad" valorTexto={textoDe(MODALIDADES, filtros.modalidad)} activo={Boolean(filtros.modalidad)}>
        {(cerrar) => (<>
        <MenuOpciones cerrar={cerrar} nombre="modalidad" leyenda="Modalidad" opciones={conTodas(MODALIDADES, "Todas")} valor={filtros.modalidad} onCambiar={onCambiar} />
      </>)}
      </ChipMenu>
      <ChipMenu etiqueta="Jornada" valorTexto={textoDe(JORNADAS, filtros.jornada)} activo={Boolean(filtros.jornada)}>
        {(cerrar) => (<>
        <MenuOpciones cerrar={cerrar} nombre="jornada" leyenda="Jornada y contrato" opciones={conTodas(JORNADAS, "Todas")} valor={filtros.jornada} onCambiar={onCambiar} />
      </>)}
      </ChipMenu>
      {empresas.length ? (
        <ChipMenu etiqueta="Empresa" valorTexto={nombreEmpresa} activo={Boolean(filtros.id_empresa)}>
          {(cerrar) => (<>
          <MenuOpciones cerrar={cerrar} nombre="id_empresa" leyenda="Empresa" valor={filtros.id_empresa} onCambiar={onCambiar}
            opciones={[{ valor: "", texto: "Todas las empresas" }, ...empresas.map((e) => ({ valor: String(e.id_empresa), texto: e.nombre_empresa || "Empresa" }))]} />
        </>)}
        </ChipMenu>
      ) : null}
      <Alternar activo={filtros.sin_experiencia === "1"} onClick={() => onCambiar("sin_experiencia", filtros.sin_experiencia === "1" ? "" : "1")}>Sin experiencia</Alternar>
      <Alternar className="wa" activo={filtros.whatsapp === "1"} onClick={() => onCambiar("whatsapp", filtros.whatsapp === "1" ? "" : "1")}>
        <IconoWhatsApp />Postúlate por WhatsApp
      </Alternar>
      {hayAlgo ? <button type="button" className="bt2-texto-btn" onClick={onLimpiar}>Limpiar filtros</button> : null}
    </div>
  );
}

// Chips rápidos del celular: «Filtros · N» abre la hoja; los demás son de un toque.
export function ChipsCelular({ filtros, cuantos, onAbrir, onCambiar, onOrden }) {
  return (
    <div className="bt2-chips-rapidos" role="group" aria-label="Filtros rápidos">
      <button type="button" id="bt2-abrir-filtros" className="bt2-chip oscuro" onClick={onAbrir} aria-haspopup="dialog">
        <SlidersHorizontal aria-hidden="true" />Filtros{cuantos ? <span> · {cuantos}</span> : null}
      </button>
      <Alternar activo={filtros.orden === "cerca"} onClick={() => onOrden(filtros.orden === "cerca" ? "" : "cerca")}>
        <MapPin aria-hidden="true" />Cerca de mí
      </Alternar>
      <Alternar className="wa" activo={filtros.whatsapp === "1"} onClick={() => onCambiar("whatsapp", filtros.whatsapp === "1" ? "" : "1")}>Por WhatsApp</Alternar>
      <Alternar activo={filtros.sin_experiencia === "1"} onClick={() => onCambiar("sin_experiencia", filtros.sin_experiencia === "1" ? "" : "1")}>Sin experiencia</Alternar>
    </div>
  );
}

// Casilla grande dentro de la hoja (toda la fila es el objetivo táctil).
function Casilla({ marcada, onCambiar, children }) {
  return (
    <label className="bt2-casilla">
      <span>{children}</span>
      <input type="checkbox" checked={marcada} onChange={(e) => onCambiar(e.target.checked)} />
    </label>
  );
}

// Hoja de filtros del celular (Radix Dialog: atrapa el foco, Esc y el fondo la cierran y el foco vuelve al botón).
export function HojaFiltros({ abierta, onAbierta, filtros, empresas, total, onCambiar, onOrden, onLimpiar }) {
  let ver = "Ver vacantes";
  if (typeof total === "number") ver = total === 1 ? "Ver 1 vacante" : `Ver ${total.toLocaleString("es-MX")} vacantes`;
  return (
    <Dialog.Root open={abierta} onOpenChange={onAbierta}>
      <Dialog.Portal>
        <Dialog.Overlay className="bt2-velo" />
        {/* Se abre desde un botón propio (no Dialog.Trigger): al cerrar, el foco vuelve a «Filtros». */}
        <Dialog.Content className="bt2 bt2-hoja" aria-describedby={undefined}
          onCloseAutoFocus={(e) => { e.preventDefault(); document.getElementById("bt2-abrir-filtros")?.focus(); }}>
          <span className="bt2-hoja-asa" aria-hidden="true" />
          <div className="bt2-hoja-cab">
            <Dialog.Title asChild><h2>Filtros</h2></Dialog.Title>
            <button type="button" className="bt2-texto-btn" onClick={onLimpiar}>Limpiar</button>
            <Dialog.Close className="bt2-icono-btn" aria-label="Cerrar filtros"><X aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="bt2-hoja-cuerpo">
            <Opciones idBase="hoja" nombre="orden" leyenda="Ordenar" opciones={ORDENES} valor={filtros.orden} onCambiar={(_, v) => onOrden(v)} />
            <Opciones idBase="hoja" nombre="sueldo_min" leyenda="Sueldo mensual" opciones={opcionesSueldo} valor={filtros.sueldo_min} onCambiar={onCambiar} />
            <Opciones idBase="hoja" nombre="publicada" leyenda="Publicada" opciones={PUBLICADAS} valor={filtros.publicada} onCambiar={onCambiar} />
            <Opciones idBase="hoja" nombre="modalidad" leyenda="Modalidad" opciones={conTodas(MODALIDADES, "Todas")} valor={filtros.modalidad} onCambiar={onCambiar} />
            <Opciones idBase="hoja" nombre="jornada" leyenda="Jornada y contrato" opciones={conTodas(JORNADAS, "Todas")} valor={filtros.jornada} onCambiar={onCambiar} />
            {empresas.length ? (
              <div className="bt2-grupo">
                <label htmlFor="hoja-empresa" className="bt2-leyenda">Empresa</label>
                <select id="hoja-empresa" className="bt2-select" value={filtros.id_empresa} onChange={(e) => onCambiar("id_empresa", e.target.value)}>
                  <option value="">Todas las empresas</option>
                  {empresas.map((e) => <option key={e.id_empresa} value={String(e.id_empresa)}>{e.nombre_empresa || "Empresa"}</option>)}
                </select>
              </div>
            ) : null}
            <div className="bt2-grupo">
              <Casilla marcada={filtros.whatsapp === "1"} onCambiar={(v) => onCambiar("whatsapp", v ? "1" : "")}>Solo con postulación por WhatsApp</Casilla>
              <Casilla marcada={filtros.sin_experiencia === "1"} onCambiar={(v) => onCambiar("sin_experiencia", v ? "1" : "")}>Sin experiencia</Casilla>
            </div>
          </div>
          <div className="bt2-hoja-pie">
            <Dialog.Close className="bt2-btn principal ancho">{ver}</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Paginacion({ actual, total, onIr }) {
  if (total <= 1) return null;
  return (
    <nav className="bt2-pag" aria-label="Páginas de vacantes">
      <button type="button" onClick={() => onIr(actual - 1)} disabled={actual <= 1}>
        <ChevronLeft aria-hidden="true" /> Anterior
      </button>
      <span className="bt2-pag-nums">
        {paginas(actual, total).map((p, i) =>
          p === "…" ? (
            <span key={`h${i}`} className="hueco" aria-hidden="true">…</span>
          ) : (
            <button key={p} type="button" className="num" aria-current={p === actual ? "page" : undefined} aria-label={`Página ${p}`} onClick={() => onIr(p)}>
              {p}
            </button>
          ),
        )}
      </span>
      <span className="bt2-pag-movil" aria-hidden="true">{actual} de {total}</span>
      <button type="button" onClick={() => onIr(actual + 1)} disabled={actual >= total}>
        Siguiente <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
