---
titulo: Roles y permisos por módulo
resumen: Qué puede hacer cada rol (Administrador, Recursos Humanos, Reclutador, Solo lectura, Personalizado) y qué significan Sin acceso, Ver y Ver y editar en cada módulo.
modulo: usuarios
audiencia: [dueno, rh]
pantallas: [/panel/usuarios-con-acceso]
palabras: [roles, permisos, plantillas, administrador, recursos humanos, reclutador, solo lectura, personalizado, sin acceso, ver, ver y editar, no tienes acceso, solo del dueño]
orden: 20
actualizado: 2026-11-27
fuentes: [src/lib/permisos/permisos.mjs, src/components/permisos/EditorPermisos.jsx, src/components/permisos/GuardaPermiso.jsx]
---

## Para qué sirve

Esta guía te ayuda a decidir qué permisos darle a cada persona de tu equipo y explica qué ve alguien que tiene permisos limitados.

## Quién la usa

El dueño de la cuenta, que es quien asigna los permisos. También le sirve a cualquier usuario con acceso que quiera entender por qué no ve algo.

## Antes de empezar

Los permisos se asignan en **Ajustes → Usuarios con acceso**. Ve [Cómo dar acceso al panel a otra persona](/ayuda/usuarios/dar-acceso-a-tu-equipo).

## Los tres niveles

| Nivel | Qué puede hacer |
| --- | --- |
| Sin acceso | El módulo no aparece en su menú. Si entra por la dirección ve «No tienes acceso a este módulo» |
| Ver | Entra y consulta. Arriba ve el aviso «Solo puedes ver este módulo. Para hacer cambios, pídele permiso de edición al dueño.» y los botones que cambian datos (Guardar, Nuevo, Eliminar, Aprobar…) se ocultan |
| Ver y editar | Puede consultar y hacer cambios |

> **Importante:** La seguridad no depende solo de la pantalla: el servidor también revisa cada permiso. Aunque alguien encontrara un botón, sin permiso de edición su cambio se rechaza.

## Los módulos de la matriz

La matriz tiene una fila por cada módulo de ADAMIA (Asistencias, Empleados, Nómina, Vacaciones, Permisos, Evaluación de desempeño, Reclutamiento, Tareas y checklists, Activos y uniformes, Gestión documental, Turnos extra, Inducción digital y Centro de comunicados), más **Clima y NOM-035** y **Ajustes de la empresa** (datos y logo de la empresa, plantillas de felicitación y campos personalizados).

![Matriz de permisos por módulo](/ayuda/capturas/usuarios/permisos-por-modulo.webp "En escritorio es una matriz; en el celular cada módulo es una tarjeta con tres botones")

## Las plantillas de rol

| Plantilla | Qué incluye |
| --- | --- |
| Administrador | Ve y edita todos los módulos |
| Recursos Humanos | Edita Empleados, Asistencias, Vacaciones, Permisos, Turnos extra, Nómina, Gestión documental, Clima y NOM-035, Evaluaciones, Inducción y Comunicados. Solo ve Reclutamiento, Tareas, Activos y Ajustes de la empresa |
| Reclutador | Edita Reclutamiento (incluye bolsa de trabajo y WhatsApp) y solo ve Empleados |
| Solo lectura | Ve todos los módulos y no cambia nada |
| Personalizado | Tú eliges módulo por módulo |

Si eliges una plantilla y después cambias un módulo, el rol pasa a **Personalizado**. Si tu combinación coincide exactamente con una plantilla, se muestra con el nombre de esa plantilla.

## Lo que es solo del dueño

Estas secciones no dependen de los permisos: **solo las usa la cuenta principal**.

- Ajustes → **Usuarios con acceso**
- Ajustes → **Módulos**
- Ajustes → **Mi suscripción**
- Ajustes → **Integraciones**
- **Autorizar** una nómina y cancelar una nómina autorizada
- Cancelar un préstamo vigente con saldo

Un usuario con acceso que entra a una de ellas ve «Solo para el dueño de la cuenta».

## Lo que cualquiera con sesión puede usar

**Resumen**, **Perfil**, **Seguridad y Face ID**, **Créditos de Adamia AI** y **Mis encuestas** están disponibles para todos los usuarios del panel, sin importar sus permisos.

## Empresas

Si tienes varias empresas, cada acceso puede entrar a **Todas las empresas** (también las que agregues después) o **Solo algunas**. Con «Solo algunas», la persona solo ve los datos de las empresas marcadas.

## Preguntas frecuentes

### ¿Por qué alguien ve la lista de empleados aunque no tenga permiso de Empleados?

Muchas pantallas necesitan la lista de personas y catálogos básicos (departamentos, puestos, sucursales, turnos, festivos). Por eso se pueden **consultar** con permiso de ver cualquier módulo. Editarlos sí requiere permiso de Empleados.

### ¿Qué rol le doy a mi encargada de nómina?

**Recursos Humanos** incluye Nómina con edición. Recuerda que, aun así, solo el dueño autoriza la nómina.

### ¿Cuánto tardan en aplicarse los cambios?

Menos de un minuto. La persona no necesita volver a entrar; su menú se actualiza al recargar la página.

## Qué pasa si…

- **…una persona dice que no ve un módulo.** Revisa su permiso en ese módulo y, también, que el módulo esté encendido en **Ajustes → Módulos**.
- **…ve el módulo pero no los botones para guardar.** Tiene permiso **Ver**. Cámbialo a **Ver y editar**.
- **…su acceso fue eliminado mientras trabajaba.** Sus siguientes acciones se rechazan y tendrá que salir.

## Relacionado

- [Cómo dar acceso al panel a otra persona](/ayuda/usuarios/dar-acceso-a-tu-equipo)
- [Cómo encender o apagar módulos](/ayuda/modulos/encender-y-apagar-modulos)
