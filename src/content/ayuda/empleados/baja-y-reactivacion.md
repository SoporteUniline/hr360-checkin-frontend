---
titulo: Cómo dar de baja o reactivar a un empleado
resumen: Registra la salida de una persona con su motivo, genera su finiquito si quieres y, si regresa, reactívala sin volver a capturar su ficha.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [baja, despido, renuncia, inactivo, reactivar, finiquito, liquidación, salida, motivo de baja]
orden: 30
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/EstadoEmpleadoDialog.jsx, src/app/panel/empleados/EmpleadosTable.jsx, src/components/BajaEmpleadoInfo.jsx]
---

## Para qué sirve

**Dar de baja** marca a la persona como **Inactiva**: deja de contar como personal activo, sale de los relojes checadores y ya no puede entrar a su app. Su historial (asistencias, nóminas, documentos) se conserva.

**Reactivar** la regresa a **Activa** con la misma ficha, sin capturar nada de nuevo.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Ten claro el **motivo de la baja** (renuncia voluntaria, despido, fin de contrato, etc.). Es obligatorio.
- La baja se registra **con la fecha de hoy**.

## Paso a paso: dar de baja

1. Entra a **Gestión de personal → Empleados**.
2. Busca a la persona en la pestaña **Activos**.
3. En **Acciones**, toca el bote rojo (**Dar de baja**).
4. En la ventana **¿Deseas dar de baja a este empleado?** escribe el motivo.
5. Toca `Confirmar baja`. El botón se activa solo cuando escribiste un motivo.
6. Verás «Empleado dado de baja» y la pregunta **¿Generar finiquito?**:
   - `Sí, generar finiquito` te lleva a **Finiquitos y liquidaciones** con la persona ya elegida.
   - `No` cierra la ventana; puedes hacer el finiquito después.

![Ventana para dar de baja con el motivo escrito](/ayuda/capturas/empleados/dialogo-dar-de-baja.webp "El motivo de la baja es obligatorio")

## Paso a paso: reactivar

1. En **Empleados**, abre la pestaña **Inactivos**.
2. En **Acciones**, toca el escudo verde (**Reactivar**).
3. Toca `Confirmar reactivación`. Verás «Empleado reactivado».

## Qué cambia al dar de baja

| Qué | Qué pasa |
| --- | --- |
| Relojes checadores | Se manda quitar a la persona de los relojes de la empresa. |
| Su app (Mi espacio) | Se cierran sus sesiones abiertas. |
| Ficha | Pasa a **Inactivo** y en la pestaña **Trabajo** se ve **Baja del empleado** con la fecha y el motivo. |
| Historial | Se conserva todo: asistencias, nóminas, documentos y contratos. |
| Avisos de cumpleaños y aniversario | Solo se avisa de personas activas. |

Al **reactivar**, se manda de nuevo a los relojes y el motivo de baja se borra.

## Preguntas frecuentes

### ¿Puedo poner una fecha de baja anterior?

Desde esta ventana no: la baja se registra con la fecha del día. Si necesitas documentar otra fecha (por ejemplo, para el finiquito), indícala en el finiquito y en el motivo.

### ¿Se borra al empleado?

No. Dar de baja no elimina la ficha ni su historial. Por eso, si la persona regresa, se reactiva en lugar de darla de alta otra vez.

### ¿Por qué no me deja darlo de alta de nuevo si ya trabajó aquí?

Porque su correo, CURP, RFC, NSS o código siguen registrados en su ficha anterior. Búscalo en **Inactivos** y reactívalo.

### ¿Qué pasa con su contrato?

La baja no cambia el estatus del contrato. Si el contrato termina, cámbialo en [Contratos laborales](/ayuda/documentos/contratos) a **Terminado** con su motivo.

## Qué pasa si…

- **…el reloj está sin internet:** la orden de quitarlo queda en espera y el reloj la aplica cuando se conecta.
- **…cancelo la ventana del finiquito:** la baja ya quedó registrada; solo no se abre el finiquito.
- **…una persona de baja vuelve a entrar por Inducción digital:** al «Revisar y dar de alta», si ya existe una ficha **de baja** con la misma CURP o correo, el sistema no crea otra: te pide reactivarla en Empleados.

## Relacionado

- [Empleados: tu plantilla en una sola pantalla](/ayuda/empleados)
- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Contratos laborales](/ayuda/documentos/contratos)
