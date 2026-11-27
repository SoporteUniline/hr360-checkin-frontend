---
titulo: Cómo sincronizar empleados con el reloj checador
resumen: Manda a tus relojes checadores a todas las personas activas que tienen código, sin borrar huellas, rostros ni tarjetas.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [sincronizar, reloj, checador, dispositivo, nip, código, huella, usuarios del reloj]
orden: 45
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/page.jsx, src/app/panel/empleados/EmpleadosTable.jsx]
---

## Para qué sirve

Cuando das de alta o cambias a alguien, ADAMIA lo manda solo a los relojes. **Sincronizar con reloj** sirve para mandar a **todas** las personas activas de una vez, por ejemplo al conectar un reloj nuevo o si alguien no aparece en el equipo.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Elige una **empresa específica** en **Unidad de negocio** (con **Todas las empresas** el botón está desactivado).
- Las personas necesitan **Código de empleado** (NIP). Quien no lo tenga se cuenta como **Sin NIP** y no se manda.
- El reloj debe estar **activo** y conectado a internet.

## Cómo sincronizar los empleados

1. Entra a **Gestión de personal → Empleados**.
2. Toca `Sincronizar con reloj`.
3. Lee la ventana **Sincronizar empleados con el reloj** y toca `Sincronizar empleados`.
4. Revisa el resultado **Sincronización solicitada**: Encontrados, Procesados, Comandos creados y Sin NIP. Toca `Listo`.

![Ventana Sincronizar empleados con el reloj](/ayuda/capturas/empleados/sincronizar-con-reloj.webp "Qué hace la sincronización")

Durante un minuto la lista se actualiza sola para que veas cómo avanza la columna **Sincronización**.

## Qué hace y qué no hace

- **Sí:** crea en el reloj a quien todavía no existe y actualiza los nombres de quien ya existe.
- **Sí:** conserva las huellas, rostros, tarjetas y contraseñas que ya están en el reloj.
- **No:** no elimina usuarios que ya están en el dispositivo.

## Estados de la columna Sincronización

| Estado | Qué significa |
| --- | --- |
| Sincronizado | Ya está en los relojes. |
| Pendiente | La orden está en cola; el reloj la procesa poco a poco. |
| Parcial | Está en algunos relojes pero no en todos. |
| Error | Algún reloj rechazó la orden. Intenta de nuevo. |
| Eliminado | Se quitó de los relojes (por ejemplo, al darlo de baja). |
| Sin NIP | No tiene código de empleado. |
| Sin relojes | Tu empresa no tiene relojes activos. |
| No aplica / Sin información | No hay nada que sincronizar o aún no hay datos. |

## Preguntas frecuentes

### ¿Cuánto tarda?

Los comandos se mandan a una cola y el reloj los procesa **gradualmente mientras esté conectado**. Con muchas personas puede tardar unos minutos.

### ¿Se mandan también los dados de baja?

No. Solo se envían los empleados **activos** con código.

## Qué pasa si…

- **…aparece «No se pudo sincronizar»:** lee el motivo en la ventana. Si dice que selecciones una empresa, elige una en **Unidad de negocio** y vuelve a intentar.
- **…hay «Comandos omitidos» o «Errores registrados»:** algunas personas no se pudieron mandar. Revisa que tengan código y vuelve a sincronizar.
- **…el reloj está apagado:** la orden se queda esperando y se aplica cuando el reloj vuelve a conectarse.

## Relacionado

- [Empleados: tu plantilla en una sola pantalla](/ayuda/empleados)
- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
