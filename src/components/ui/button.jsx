import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";

/**
 * Botón único del sistema (28/11/2026, mockup aprobado; docs/sistema-diseno.md). Los colores y tamaños salen de los
 * tokens de src/app/globals.css: cambiar --adamia-blue o --adamia-alto-boton ahí cambia TODOS los botones.
 *
 * Elige la variante por INTENCIÓN, no por gusto:
 *   variant="default"             azul · la acción principal (Guardar, Continuar, Enviar). Una por pantalla.
 *   variant="outline"             gris con contorno · Cancelar, Salir, Atrás, Exportar.
 *   variant="destructive"         rojo · borrar o cancelar algo que no se deshace (siempre con confirmación).
 *   variant="destructive-outline" contorno rojo · «Dar de baja»: abre la confirmación.
 *   variant="secondary"           gris relleno · acciones de apoyo poco importantes.
 *   variant="ghost" / "link"      sin caja · acciones de texto.
 * Tamaños:
 *   size="default"  48 px (lo normal)        size="lg"   56 px (el principal de un formulario o ventana)
 *   size="sm"       44 px (compacto: barras con muchos botones y renglones de tabla)
 *   size="icon"     44 × 44 (solo ícono; SOLO en renglones de tabla, siempre con aria-label)
 *
 * Ejemplo:
 *   <Button size="lg" onClick={guardar}>Guardar</Button>
 *   <Button variant="outline" onClick={cancelar}>Cancelar</Button>
 *   <Button variant="outline" size="icon" aria-label="Editar"><Pencil /></Button>
 *
 * Props extra: loading (muestra los puntos y deshabilita), startIcon, endIcon, asChild (Radix Slot). El botón deja
 * data-variante y data-tamano en el HTML para que las pruebas (scripts/verify-diseno.mjs) lo reconozcan.
 */
const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-boton font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-brand/40 aria-invalid:ring-peligro/20 aria-invalid:border-peligro",
  {
    variants: {
      variant: {
        // Deshabilitado: gris sólido (#E5E7EB / #6B7280), no azul desvanecido; abajo se explica por qué no se puede.
        default:
          "bg-brand text-white hover:bg-brand-hover disabled:bg-borde disabled:text-texto-deshabilitado disabled:opacity-100",
        destructive:
          "bg-peligro text-white hover:bg-peligro-texto focus-visible:ring-peligro/30",
        "destructive-outline":
          "border border-peligro-borde bg-white text-peligro-texto hover:bg-peligro-suave focus-visible:ring-peligro/30",
        outline:
          "border border-borde-campo bg-white text-texto-boton hover:bg-franja",
        secondary:
          "bg-franja text-texto-boton hover:bg-borde",
        ghost:
          "text-texto-boton hover:bg-franja",
        link: "text-brand underline-offset-4 hover:text-brand-hover hover:underline",
      },
      size: {
        default: "h-boton px-6 text-boton has-[>svg]:px-5",
        sm: "h-icono gap-1.5 px-4 text-boton has-[>svg]:px-3.5",
        lg: "h-boton-principal px-7 text-boton-principal has-[>svg]:px-6",
        icon: "size-icono",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled = false,
  endIcon = null,
  startIcon = null,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variante={variant ?? "default"}
      data-tamano={size ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {/* 
        IMPORTANTE:
        - Cuando `asChild` es true, Radix `Slot` exige un solo child (React.Children.only).
        - Nuestro botón soporta `startIcon` / `endIcon` / `loading`, pero esos renderizan
          nodos hermanos adicionales (aunque sean `null`) y rompen `Slot`.
        - Por eso, en modo `asChild` renderizamos únicamente `children`.
      */}
      {asChild ? (
        props.children
      ) : (
        <>
          {loading ? (
            <Icon icon="eos-icons:three-dots-loading" width="24" height="24" />
          ) : startIcon ? (
            startIcon
          ) : null}
          {props.children}
          {endIcon}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
