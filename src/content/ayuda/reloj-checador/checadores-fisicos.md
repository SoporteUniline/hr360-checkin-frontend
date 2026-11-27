---
titulo: Checadores físicos (ZKTeco y Hikvision)
resumen: Puedes usar un checador físico compatible en lugar de (o además de) una tableta; sus checadas llegan a ADAMIA y se ven en Asistencias y en Entradas y salidas.
modulo: reloj-checador
audiencia: [dueno, rh]
pantallas: []
palabras: [checador físico, ZKTeco, Hikvision, reloj de huella, biométrico, dispositivo, número de serie, PIN, código, asistencia automática]
orden: 80
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/tabs/TabLaborales.jsx, src/app/panel/registro-de-entradas-y-salidas/page.jsx]
---

## Para qué sirve

Si prefieres un **checador físico** (de huella, rostro o tarjeta) en la entrada, ADAMIA puede recibir sus checadas. Las checadas del equipo llegan al sistema igual que las del reloj en tableta: aparecen en **Asistencias**, **Entradas y salidas** y el **Monitor**.

ADAMIA es compatible con equipos **ZKTeco** y **Hikvision** que se conectan por internet.

## Quién la usa

El dueño o Recursos Humanos, junto con el equipo de ADAMIA para darlo de alta.

## Antes de empezar

- Ten a la mano el **número de serie (SN)** del equipo; viene en una etiqueta del aparato o en su menú.
- El equipo debe tener **conexión a internet**.

## Cómo conectar un checador físico

1. Pide al equipo de soporte de ADAMIA que registre tu checador con su **número de serie** y lo asigne a tu empresa. Puedes darle un nombre (por ejemplo «Entrada principal»).
2. Configura el equipo para enviar sus registros a ADAMIA, con las indicaciones que te dé soporte.
3. En el checador, da de alta a cada empleado usando como número de usuario (PIN) el **mismo código** que tiene en ADAMIA.
4. Haz una checada de prueba y revisa que aparezca en **Entradas y salidas**.

> **Importante:** el checador identifica a cada persona por su **código**. Si el número de usuario del equipo no coincide con el código del empleado en ADAMIA, esa checada no se registra.

## Preguntas frecuentes

### ¿Tengo que hacer algo en la ficha del empleado?

Revisa en la ficha, pestaña **Checador y acceso**, que su **código** sea el mismo que en el checador y que **Asistencia Automática** esté apagada. Con Asistencia Automática encendida el sistema genera sus registros con su horario y no toma sus checadas del equipo.

### ¿Las checadas del equipo hacen la pregunta «¿Sales a comer?»?

No: el equipo físico solo manda la hora de cada checada. Si necesitas controlar la comida con detalle, el reloj de ADAMIA en tableta pregunta y tiene **Voy a comer**.

### ¿Puedo corregir una checada que vino del equipo?

Sí, igual que cualquier otra, en el reloj del día con su motivo. Ver [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia).

### ¿Qué pasa si una persona checa dos veces seguidas en el equipo?

El sistema ignora la checada repetida para no duplicar el registro.

## Qué pasa si…

- **…el equipo se desasigna de tu empresa:** deja de procesar checadas hasta que se vuelva a asignar.
- **…el empleado no existe o tiene otro código:** la checada no se registra; revisa el código en su ficha.
- **…el equipo pierde internet:** no podrá enviar sus checadas a ADAMIA mientras no tenga conexión.

## Relacionado

- [Cómo instalar el reloj checador de la empresa](/ayuda/reloj-checador/abrir-el-reloj-de-la-empresa)
- [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado)
- [Cómo consultar y corregir entradas y salidas](/ayuda/asistencias/entradas-y-salidas)
