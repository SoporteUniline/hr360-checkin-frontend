---
name: continuidad-proyecto
description: Conservar y recuperar decisiones, estado, dependencias y evidencias entre sesiones o antes de compactar. Usar al retomar un trabajo interrumpido, después de un hito y cuando un cambio vuelve obsoleta una relación.
---

# Continuidad y memoria viva — Uniline

## Memoria de errores prevenidos
Los incidentes versionados en `docs/incidentes/INC-XXX.md` y el registro `calidad/aprendizajes.json` complementan `docs/contexto/relaciones.json`. Al retomar un módulo, recuperar solo fallos previos pertinentes y sus pruebas; no cargar todos los incidentes. No presentar un fallo «aprendido» hasta que exista regresión ejecutable, evidencia y revisión. Invalidar referencias obsoletas cuando cambie la fuente.


## Esquema de checkpoint verificable
Usa `references/checkpoint-esquema.md` para registrar estado, origen, versión, decisiones D-XXX, hechos, dependencias confirmadas/posibles, invalidez por cambios, pruebas, riesgos y siguiente paso. Nunca persistas propuesta como hecho ni secretos como memoria. Al cambiar una regla, marca relaciones antiguas como `requiere revalidación` hasta comprobarlas.

## Consolidación e invalidación de relaciones
Usa `memoria-asociativa` para conservar una red de referencias de módulos/decisiones/código en `docs/contexto/relaciones.json`, cuando el proyecto tenga índice. Actualiza solo relaciones realmente verificadas; si cambia una fuente, detecta vínculos potencialmente obsoletos y exige revalidación. El checkpoint conserva referencias y motivos, no copias enteras de documentos. No guardes secretos ni claims no probados.


**El historial de chat no sustituye una memoria persistente verificable.**

## Tres capas
**Permanente:** visión, reglas aprobadas, identidad corporativa, seguridad y relaciones críticas en /docs. Cambia poco.
**Trabajo actual:** /docs/00-estado.md, tarea, rama/versión, autorización, preguntas y siguiente paso. Breve y actual.
**Evidencia bajo demanda:** módulos, código, tablas, commits, pruebas, capturas y fuentes consultables con procedencia.

## Retomar una sesión
- Lee /docs/00-estado.md y decisiones relevantes D-XXX; verifica la rama/versión y si el código coincide con la documentación.
- Distingue **requisito aprobado** vs **implementación observada**, **propuesta** vs **hecho** y **commit** vs **despliegue**.
- No repitas preguntas resueltas y todavía vigentes.

## Checkpoint antes de compactar o cerrar
Guardar: objetivo, fase, versión, reglas aprobadas, cambios observados, dependencias, pruebas realizadas, pruebas faltantes, riesgos, pendientes, una siguiente acción exacta. Registrar cuándo y de qué fuente viene el conocimiento.
No guardar conclusiones no verificadas como hechos. No generar commits para una mera charla. Coordinar escrituras entre agentes.

## Invalidación selectiva
Al modificar un campo o flujo, ubica la memoria que depende de él, marca relaciones pertinentes como «requiere revalidación» y conserva historial. No concluir que todo el sistema cambió.
El nuevo agente debe poder contestar: qué estábamos haciendo, qué sabemos, qué se aprobó, qué se probó, qué sigue.

## Herramienta externa opcional
Beads (https://github.com/gastownhall/beads) para tickets y dependencias multiagente. No instalar por defecto ni confundir tickets con reglas de negocio.
