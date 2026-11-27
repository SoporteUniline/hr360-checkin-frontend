---
titulo: Nómina
resumen: Calcula la nómina con la asistencia real, revisa cada recibo, autorízala y manda los recibos para firmar. Incluye bonos y descuentos, préstamos, aguinaldos y finiquitos.
modulo: nomina
audiencia: [rh, dueno, empleado]
pantallas: []
palabras: [nómina, nomina, pago, recibos, sueldo, bonos, préstamos, aguinaldo, finiquito, liquidación]
orden: 1
actualizado: 2026-11-27
fuentes: [src/components/nomina/ModuloNomina.jsx, src/lib/nomina/nomina.mjs, src/lib/modulos/catalogo.mjs, src/components/Sidebar/nav-main.jsx]
---

## Para qué sirve

El módulo **Nómina** te ayuda a pagarle a tu equipo sin hacer cuentas a mano. ADAMIA toma la asistencia del periodo (días trabajados, faltas, retardos, horas extra autorizadas, festivos y permisos), le suma los bonos y le resta los descuentos y préstamos. Tú revisas, ajustas lo que haga falta y el dueño de la cuenta autoriza. Al autorizar, cada persona recibe su recibo en PDF por correo y lo firma desde su celular.

> **Importante:** Los recibos de ADAMIA **no están timbrados**: no son un CFDI de nómina. Te sirven para calcular, controlar y comprobar lo que pagas. Si tu empresa timbra con un contador o con otro sistema, puedes descargar el Excel de pagos y usarlo como base.

## Qué incluye

En el menú lateral, dentro de **Nómina**, encuentras cinco secciones. Las tres primeras comparten la misma pantalla con pestañas arriba: **Nóminas**, **Bonos y descuentos** y **Préstamos**.

| Sección | Qué haces ahí | Guía |
| --- | --- | --- |
| Nóminas | Crear, calcular, revisar, autorizar y cancelar nóminas | [Cómo crear y calcular una nómina](/ayuda/nomina/crear-y-calcular-nomina) |
| Bonos y descuentos | Tu catálogo de bonos y descuentos y a quién se le aplica cada uno | [Cómo crear bonos y descuentos](/ayuda/nomina/bonos-y-descuentos) |
| Préstamos | Aprobar, registrar y cobrar préstamos sin intereses | [Cómo manejar préstamos a empleados](/ayuda/nomina/prestamos) |
| Finiquitos y liquidaciones | Calcular, guardar y mandar a firmar el finiquito o la liquidación | [Cómo calcular un finiquito o una liquidación](/ayuda/nomina/finiquitos-y-liquidaciones) |
| Aguinaldos | Calcular el aguinaldo de varias personas a la vez, guardarlo y descargar PDF | [Cómo calcular aguinaldos](/ayuda/nomina/aguinaldos) |

Y en **Mi espacio** (la app del empleado) cada persona tiene **Mis recibos de pago** y **Mis préstamos**.

## Cómo fluye una nómina

1. **Borrador.** Recursos Humanos crea la nómina y ADAMIA la calcula. Mientras está en borrador se puede recalcular, corregir asistencias y ajustar importes.
2. **Por autorizar.** RH la envía al dueño. Ya no se puede editar; si hace falta un cambio, se regresa a borrador.
3. **Autorizada.** El dueño la autoriza. Se cierran las checadas de esas fechas y se envían los recibos por correo para firmar.
4. **Cancelada.** Se puede cancelar con un motivo. Si ya estaba autorizada, solo el dueño puede cancelarla.

![Lista de nóminas con sus estados](/ayuda/capturas/nomina/nominas-lista.webp "La lista de nóminas: arriba los totales y abajo cada periodo con su estado")

## Quién hace qué

| Rol | Qué puede hacer |
| --- | --- |
| Recursos Humanos (o un usuario con acceso con permiso de editar Nómina) | Crear y recalcular nóminas, ajustar recibos, enviar a autorizar, cancelar las que no están autorizadas, aprobar préstamos, calcular aguinaldos y finiquitos |
| Dueño de la cuenta | Todo lo anterior y además **autorizar** la nómina, cancelar una nómina ya autorizada y cancelar un préstamo vigente con saldo |
| Empleado | Ver y firmar sus recibos, pedir un préstamo y firmar su acuerdo desde Mi espacio |

> **Ojo:** «Dueño» es la cuenta principal de la empresa. Un usuario con acceso no puede autorizar la nómina aunque tenga el rol Administrador.

## Antes de empezar

- El módulo **Nómina** debe estar encendido en **Ajustes → Módulos**. Si está apagado, la sección no aparece. Ve [Cómo encender o apagar módulos](/ayuda/modulos/encender-y-apagar-modulos).
- Cada empleado necesita en su ficha, pestaña **Datos de nómina**, su **periodo de pago** (semanal, quincenal, etc.), su **sueldo** y su **medio de pago**. Sin periodo de pago la persona no entra en ninguna nómina.
- La nómina usa la asistencia: horarios, checadas, faltas, permisos y horas extra **autorizadas**. Revisa Asistencias antes de calcular.

## Relacionado

- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
- [Cómo revisar y ajustar los recibos](/ayuda/nomina/revisar-y-ajustar-recibos)
- [Cómo autorizar la nómina y enviar los recibos](/ayuda/nomina/autorizar-y-enviar-recibos)
- [Mis recibos de pago (empleados)](/ayuda/nomina/mis-recibos-de-pago)
