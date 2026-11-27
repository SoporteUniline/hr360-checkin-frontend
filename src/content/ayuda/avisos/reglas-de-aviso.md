---
titulo: Reglas de aviso
resumen: Activa y configura los correos automáticos de ADAMIA (felicitaciones, cumpleaños y aniversarios, contratos por vencer, inasistencias y retardos), con su frecuencia y destinatarios.
modulo: avisos
audiencia: [rh, dueno]
pantallas: [/panel/reglas-aviso]
palabras: [reglas de aviso, avisos, notificaciones, correo automático, reporte, cumpleaños, aniversario, contratos por vencer, inasistencias, llegadas tarde, felicitar, duplicar regla, destinatarios]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/reglas-aviso/page.jsx, src/components/avisos/PlantillasFelicitacion.jsx, src/lib/permisos/permisos.mjs]
---

## Para qué sirve

Las **Reglas de aviso** son los correos que ADAMIA manda solo, sin que tengas que acordarte: felicitar a alguien en su cumpleaños o aniversario, mandarte la lista de cumpleaños del mes, avisarte de los contratos por vencer o de quién faltó o llegó tarde. Aquí decides cuáles están encendidas, cada cuánto llegan y a quién.

## Quién la usa

Recursos Humanos y el dueño de la cuenta. Un usuario con acceso necesita permiso en **Asistencias** (con **Ver y editar** para hacer cambios).

## Antes de empezar

- Entra por **Ajustes → Reglas de aviso**.
- Los reportes se mandan por correo a las personas que elijas como destinatarias. Revisa que tengan correo (o correo de notificaciones) en su ficha.
- Los correos salen alrededor de las **9:05 a. m.** en la zona horaria de la empresa, el día que toca.

## Cómo leer la lista

![Lista de reglas de aviso](/ayuda/capturas/avisos/reglas-lista.webp "Cada regla con su configuración, destinatarios, acciones e interruptor")

Arriba: **Total reglas**, **Reglas activas**, **Reglas inactivas** y **Total empleados** (destinatarios). Puedes filtrar por **Unidad de negocio**, buscar con «Buscar regla…» y elegir **Todos los estados**, **Activas** o **Inactivas**. **Limpiar filtros** quita todo.

Cada renglón muestra el **Tipo de regla**, la **Unidad de negocio**, la **Configuración actual** (por ejemplo «Cada Lunes: próximos 30 días»), cuántos **Empleados** la reciben, las **Acciones** y el interruptor de **Estado**.

> **Consejo:** Las reglas ya vienen creadas para tu empresa; no se crean desde cero. Si necesitas otra variante (por ejemplo, el reporte de contratos cada lunes y también el día 1 del mes), usa **Duplicar**.

## Los tipos de regla

Los nombres exactos pueden variar un poco, pero son de estos grupos:

| Tipo | Qué hace | Qué puedes configurar |
| --- | --- | --- |
| Felicitar cumpleaños / Felicitar aniversario | Manda el correo de felicitación a la persona el día de su cumpleaños o aniversario laboral | Solo encender o apagar (dice «Solo ON/OFF» y aplica a todos) |
| Avisar cumpleaños o aniversarios | Te manda la lista de quién cumple | Frecuencia del reporte: Semanalmente (qué día) o Mensualmente (qué día del mes y si avisar «Los de este mes» o «Los del próximo mes») |
| Contratos por vencer | Te manda los contratos que vencen pronto | Todos los días, un día de la semana o un día del mes; cuántos días hacia adelante revisar; si también se avisa a cada empleado |
| Inasistencias / Llegadas tarde | Te manda el reporte de quién faltó o llegó tarde | Todos los días o Semanalmente (resumen); de cuántos días |

## Cómo encender o apagar una regla

Usa el interruptor de la columna **Estado**. El cambio se guarda al instante.

## Cómo configurar una regla

1. Presiona el lápiz (**Editar**) de la regla.
2. Se abre **Configurar regla**. A la izquierda eliges cuándo:
   - **Frecuencia** (según el tipo: Todos los días, Semanalmente, Mensualmente, Día específico de la semana o Día específico del mes);
   - **¿Qué día de la semana?** o **¿Qué día del mes?** (Día 1, 5, 10, 15, 20, 25 o Último día del mes);
   - en contratos, **¿En cuántos días vencerán los contratos que quieres monitorear?** (por ejemplo, 30 = los que vencen en los próximos 30 días) y la casilla **También notificar a cada empleado sobre su propio contrato**.
3. A la derecha, en **¿A quién enviar el reporte?**, marca a las personas que lo reciben (o **Seleccionar todos**). Debajo de cada nombre ves su correo o «Sin correo».
4. Presiona **Guardar cambios**.

![Configurar la regla de contratos por vencer](/ayuda/capturas/avisos/regla-configurar.webp "Cuándo se manda y a quién")

## Cómo duplicar una regla

1. Presiona **Duplicar** (icono de copiar).
2. Cambia la frecuencia, el día o los días: no se permiten dos reglas con la misma configuración exacta.
3. Elige los destinatarios y presiona **Crear regla duplicada**.

## Cómo eliminar una regla

Presiona el bote (**Eliminar**) y confirma. No se puede deshacer. Si solo quieres pausarla, mejor apágala con el interruptor.

## Preguntas frecuentes

### ¿Por qué no llegó la felicitación de cumpleaños?

Revisa tres cosas: que la regla **Felicitar cumpleaños** esté encendida, que la persona tenga correo de notificaciones en su ficha y que en **Plantillas de felicitación** esté marcado **Enviar automático por correo**.

### ¿Puedo mandar estos avisos por WhatsApp?

Las felicitaciones de cumpleaños y aniversario sí pueden salir por WhatsApp desde **Plantillas de felicitación**. Los reportes de esta pantalla llegan por correo.

### ¿Quién recibe la felicitación?

La propia persona que cumple. Por eso esa regla no tiene lista de destinatarios.

## Qué pasa si…

- **…no eliges destinatarios.** Verás «Debes seleccionar al menos un empleado.» y el botón no se activa.
- **…duplicas sin cambiar nada.** Verás «⚠️ Ya existe una regla con esta configuración exacta. Por favor cambia la frecuencia, día o ventana de días.».
- **…la persona destinataria no tiene correo.** Aparece como «Sin correo» y no recibirá el reporte.

## Relacionado

- [Plantillas de felicitación y WhatsApp](/ayuda/avisos/plantillas-de-felicitacion)
- [Roles y permisos por módulo](/ayuda/usuarios/roles-y-permisos)
