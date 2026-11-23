"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { outfit } from "@/fonts";
import { TIPOS_CONTRATACION, paginas } from "@/lib/bolsaTrabajo.mjs";

// Grupo de opciones de una sola elección (radios nativos con forma de píldora: teclado y lector de pantalla gratis).
function Pildoras({ nombre, leyenda, opciones, valor, onCambiar, idBase }) {
  return (
    <fieldset className="bt-grupo">
      <legend>{leyenda}</legend>
      <div className="bt-pills">
        {opciones.map((o) => (
          <label key={o.valor || "todas"} className="bt-pill">
            <input type="radio" name={`${idBase}-${nombre}`} value={o.valor} checked={valor === o.valor} onChange={() => onCambiar(nombre, o.valor)} />
            {o.texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Filtros secundarios: tipo de contratación, giro y país. Los mismos en la columna (escritorio) y en la hoja (celular).
export function GruposFiltros({ filtros, giros, paises, onCambiar, idBase }) {
  return (
    <>
      <Pildoras
        idBase={idBase}
        nombre="tipo_contratacion"
        leyenda="Tipo de contratación"
        valor={filtros.tipo_contratacion}
        onCambiar={onCambiar}
        opciones={[{ valor: "", texto: "Todos" }, ...TIPOS_CONTRATACION.map((t) => ({ valor: t, texto: t }))]}
      />
      {giros.length ? (
        <Pildoras
          idBase={idBase}
          nombre="giro"
          leyenda="Giro de la empresa"
          valor={filtros.giro}
          onCambiar={onCambiar}
          opciones={[{ valor: "", texto: "Todos" }, ...giros.map((g) => ({ valor: g, texto: g }))]}
        />
      ) : null}
      {paises.length > 1 ? (
        <div className="bt-grupo">
          <label htmlFor={`${idBase}-pais`}><span>País</span></label>
          <select id={`${idBase}-pais`} className="bt-select" value={filtros.pais} onChange={(e) => onCambiar("pais", e.target.value)}>
            <option value="">Todos los países</option>
            {paises.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      ) : null}
    </>
  );
}

export function HojaFiltros({ abierta, onAbierta, children, total, onLimpiar }) {
  return (
    <Dialog.Root open={abierta} onOpenChange={onAbierta}>
      <Dialog.Portal>
        <Dialog.Overlay className="bt-velo" />
        <Dialog.Content className={`lh bt-hoja ${outfit.variable}`} aria-describedby={undefined}>
          <div className="bt-hoja-cab">
            <Dialog.Title asChild><h2>Filtros</h2></Dialog.Title>
            <Dialog.Close className="bt-cerrar" aria-label="Cerrar filtros"><X aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="bt-hoja-cuerpo">{children}</div>
          <div className="bt-hoja-pie">
            <button type="button" className="btn btn-line" onClick={onLimpiar}>Limpiar</button>
            <Dialog.Close className="btn btn-primary">
              {typeof total === "number" ? (total === 1 ? "Ver 1 vacante" : `Ver ${total.toLocaleString("es-MX")} vacantes`) : "Ver vacantes"}
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Paginacion({ actual, total, onIr }) {
  if (total <= 1) return null;
  return (
    <nav className="bt-pag" aria-label="Páginas de vacantes">
      <button type="button" onClick={() => onIr(actual - 1)} disabled={actual <= 1} aria-label="Página anterior">
        <ChevronLeft aria-hidden="true" size={18} /> <span className="sr-only sm:not-sr-only">Anterior</span>
      </button>
      {paginas(actual, total).map((p, i) =>
        p === "…" ? (
          <span key={`h${i}`} className="hueco" aria-hidden="true">…</span>
        ) : (
          <button key={p} type="button" className="num" aria-current={p === actual ? "page" : undefined} aria-label={`Página ${p}`} onClick={() => onIr(p)}>
            {p}
          </button>
        ),
      )}
      <span className="movil" aria-hidden="true">Página {actual} de {total}</span>
      <button type="button" onClick={() => onIr(actual + 1)} disabled={actual >= total} aria-label="Página siguiente">
        <span className="sr-only sm:not-sr-only">Siguiente</span> <ChevronRight aria-hidden="true" size={18} />
      </button>
    </nav>
  );
}
