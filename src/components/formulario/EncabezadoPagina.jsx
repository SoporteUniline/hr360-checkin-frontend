import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Encabezado de página del sistema (28/11/2026, mockup aprobado; docs/sistema-diseno.md): franja gris (#F3F4F6) con la
 * ruta o el enlace para volver, el título (h1 en azul marino, peso 700), una descripción y las acciones a la derecha.
 * Es el mismo en listas y formularios: cambia su estilo aquí y cambia en todas las páginas.
 *
 * Props:
 *   titulo       texto del h1 (obligatorio).
 *   descripcion  texto gris debajo del título. `subtitulo` es el nombre anterior y sigue funcionando.
 *   ruta         [{ texto, href }] → «Inicio › Contratos › Nuevo» (el último va sin enlace).
 *   volver       { href, texto } → «← Contratos» (en lugar de la ruta; es lo que usan los formularios).
 *   acciones     botones a la derecha (en celular bajan debajo del título).
 *   completo     true = de orilla a orilla (dentro de PaginaFormulario). false = tarjeta con esquinas (listas).
 *   icono        ya no se dibuja (el mockup no lleva ícono); se acepta para no romper las páginas que lo pasan.
 *
 * Ejemplo:
 *   <EncabezadoPagina volver={{ href: "/panel/contratos", texto: "Contratos" }} titulo="Contrato nuevo"
 *     descripcion="Llena cada paso." acciones={<Button size="lg">+ Nuevo contrato</Button>} />
 */
export default function EncabezadoPagina({
  titulo,
  descripcion = null,
  subtitulo = null,
  ruta = null,
  volver = null,
  acciones = null,
  completo = false,
  className = "",
  icono = null,
}) {
  const texto = descripcion ?? subtitulo;
  return (
    <header
      data-encabezado-pagina
      className={cn(
        "flex flex-col gap-4 bg-franja lg:flex-row lg:items-center lg:justify-between lg:gap-6",
        completo
          ? "border-b border-borde px-4 pb-[18px] pt-4 lg:px-12 lg:py-6"
          : "rounded-seccion border border-borde px-4 py-4 lg:px-6 lg:py-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {volver ? (
          <Link href={volver.href} className="inline-flex min-h-6 items-center gap-1 self-start text-cuerpo font-medium text-brand no-underline hover:text-brand-hover">
            <ChevronLeft className="size-5" aria-hidden="true" />
            {volver.texto}
          </Link>
        ) : null}
        {!volver && ruta?.length ? (
          <nav aria-label="Ruta" data-chico className="text-[15px] text-texto-secundario">
            {ruta.map((paso, i) => (
              <span key={`${paso.texto}-${i}`}>
                {i ? " › " : null}
                {paso.href && i < ruta.length - 1
                  ? <Link href={paso.href} className="text-texto-secundario hover:text-brand">{paso.texto}</Link>
                  : paso.texto}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="m-0 break-words text-titulo-pagina font-bold leading-tight text-navy">{titulo}</h1>
        {texto ? <div className="text-cuerpo text-texto-secundario">{texto}</div> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-3">{acciones}</div> : null}
    </header>
  );
}
