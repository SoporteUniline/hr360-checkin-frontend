# Colores corporativos del sistema (21/11/2026)

Pedido del dueño: «que los colores estén corporativos en todo el sistema… hazlo como la app de empleado».

## Paleta (la de la app del empleado)
| Uso | Color | Dónde está |
|---|---|---|
| Azul ADAMIA: botones principales, foco, menú activo, enlaces | `#2563eb` (`bg-brand`, `--primary`) | `globals.css` |
| Morado ADAMIA (acento, poco uso) | `#7c3aed` (`bg-brand-accent`) | `globals.css` |
| Azul marino: títulos y texto fuerte, barra flotante oscura | `#080d36` (`--adamia-navy`) | `globals.css` |
| Fondos | blanco y `slate-50` | — |
| Avatares sin foto | `bg-blue-50 text-blue-700` | Empleados (tabla y celular) |
| Estados (sin cambio) | rojo = error/borrar, verde = correcto, ámbar = aviso | — |

## Qué se cambió
- `--primary` era el casi negro de la librería: todos los botones estándar salían negros. Ahora es el azul ADAMIA
  (modo oscuro: `#3b82f6`). También `--ring` y `--sidebar-primary`.
- Sin degradados en el sistema: 188 usos en 79 archivos pasaron a color sólido con una tabla explícita
  (marca/índigo/azul → azul ADAMIA; morados → morado ADAMIA; rojos → `red-600`; pastel → tinte claro; texto → `text-brand`).
  La página pública (`components/landing`, `app/home`, políticas, alta, calculadora, contacto, bot) conserva su estilo aprobado.
- Avatares: se quitaron 4 paletas de colores al azar (rojo, rosa, amarillo…).
- Encabezados de celular blancos (Empleados, ficha del empleado), sin el botón de menú duplicado en Empleados.
- Botones índigo (Empleados, Turnos, importar, suscripción) y selecciones en negro (filtros, Sí/No de Asistencias) → azul ADAMIA.

## Pendiente
- Estilos en archivos `.css` propios (reclutamiento, firma) no se revisaron en esta vuelta.
- Colores de categoría con significado (celeste «se repone», morado «planeado», gráficas) se dejaron como están.
