"use client";

// Piezas visuales de Mi cuenta (24/11/2026): una sola tarjeta blanca con borde sutil (como Nómina, Tareas y la ficha
// del empleado), su encabezado de sección y la barra de guardado «Sin cambios» / «Cambios sin guardar» + «Guardar».
import { Button } from "@/components/ui/button";
import EstadoCambios from "@/components/cambios/EstadoCambios";

export function Tarjeta({ titulo, descripcion, icono: Icono, acciones, children, pie, className = "", ...resto }) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white ${className}`} {...resto}>
      {titulo ? (
        <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          {Icono ? <Icono className="mt-0.5 size-[18px] shrink-0 text-brand" aria-hidden="true" /> : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[#080d36]">{titulo}</h2>
            {descripcion ? <p className="mt-0.5 text-[12.5px] text-slate-500">{descripcion}</p> : null}
          </div>
          {acciones ? <div className="shrink-0">{acciones}</div> : null}
        </header>
      ) : null}
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      {pie ? <footer className="border-t border-slate-100 px-4 py-3 sm:px-5">{pie}</footer> : null}
    </section>
  );
}

// Subtítulo de grupo dentro de una tarjeta (proximidad antes que separadores).
export function Grupo({ titulo, descripcion, children }) {
  return (
    <fieldset className="min-w-0 space-y-4">
      <legend className="mb-3">
        <span className="block text-[13.5px] font-semibold text-[#080d36]">{titulo}</span>
        {descripcion ? <span className="mt-0.5 block text-[12.5px] text-slate-500">{descripcion}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

// Barra de guardado: estado a la izquierda, botón de tamaño normal a la derecha (en teléfono, 44 px de alto).
// conEstado: false en formularios donde «Sin cambios» no aplica (contraseña).
// arriba: copia de la barra en el encabezado de un formulario largo (la de abajo es la principal).
export function BarraGuardar({ hayCambios, guardando, texto = "Guardar", form, conEstado = true, tipo = "submit", onClick, arriba = false }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {conEstado ? <EstadoCambios hayCambios={hayCambios} /> : null}
      <Button
        type={tipo}
        form={form}
        onClick={onClick}
        {...(arriba ? { "data-boton-guardar-arriba": "" } : { "data-boton-guardar": "" })}
        disabled={!hayCambios || guardando}
        aria-busy={guardando || undefined}
        className={`min-h-11 px-5 font-semibold sm:min-h-9 ${hayCambios
          ? "bg-[#2563EB] text-white shadow-sm hover:bg-[#1d4ed8]"
          : "bg-gray-100 text-gray-400 shadow-none disabled:opacity-100"}`}
      >
        {guardando ? "Guardando…" : texto}
      </Button>
    </div>
  );
}

// Clases de los campos: mismos Input del sistema, con 44 px en teléfono.
export const claseCampo = "min-h-11 sm:min-h-10 bg-white";
export const claseEtiqueta = "text-[12.5px] font-semibold text-slate-700";
