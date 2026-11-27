---
titulo: Áreas de Check — dónde se puede checar con GPS
resumen: Marca en el mapa los lugares donde tu gente puede checar (oficina, obra, sucursal) con un radio en metros, y elige qué empleados deben checar dentro de ellos.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/catalogos/areas-check]
palabras: [áreas de check, area de check, geocerca, gps, ubicación, radio, metros, mapa, checar desde el celular, fuera del área, zona permitida]
orden: 5
actualizado: 2026-11-27
fuentes: [src/app/panel/catalogos/areas-check/page.jsx, src/components/ModalArea.jsx, src/components/AreaCheckMap.jsx, src/components/RelojChecador.jsx]
---

## Para qué sirve

Un **área de check** es un punto en el mapa con un **radio permitido** en metros (una geocerca). Si a una persona le pides **ubicación GPS al checar**, el reloj de su celular solo registra la checada cuando está dentro de alguna de sus áreas. Sirve para que nadie cheque desde su casa: la oficina, una obra, una sucursal o el cliente donde trabaja.

Lo encuentras en **Catálogos base › Áreas de Check**.

![Áreas de Check con una tarjeta por área, su unidad de negocio, su radio y sus coordenadas](/ayuda/capturas/catalogos/areas-de-check.webp "Cada área con su radio permitido y su ubicación")

## Quién la usa

Recursos Humanos y el dueño. Un usuario con acceso necesita permiso en **Asistencias**.

## Antes de empezar

- Da de alta tus [unidades de negocio](/ayuda/catalogos/unidades-de-negocio): cada área pertenece a una.
- Ten a la mano la dirección exacta del lugar, o estar ahí con tu celular o computadora para usar **Mi ubicación**.
- Las áreas solo cuentan para las personas que tienen **Checar GPS** encendido en su ficha. Ve [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado).

## Cómo crear un área

1. Toca **Nueva área** (o **Agregar nueva área**; si no tienes ninguna, **Crear primera área**).
2. Si arriba tienes elegidas **Todas las unidades de negocio**, elige en **Seleccionar Empresa** a cuál pertenece el área.
3. Escribe el **Nombre del área** (por ejemplo «Oficina Centro» u «Obra Norte»).
4. Ubica el lugar: escribe la dirección en **Buscar dirección** y toca la lupa, o toca **Mi ubicación** si estás ahí.
5. Haz clic en el mapa en el **punto exacto** del lugar. Abajo verás **Área seleccionada** con su latitud y longitud.
6. Escribe el **Radio permitido (metros)**: de 10 a 1000. Si no escribes ningún radio, se usan 100 metros. El círculo del mapa te muestra hasta dónde llega.
7. Toca **Crear área**. Verás «Área creada exitosamente».

![Ventana Nueva área con el nombre, la búsqueda de dirección, el radio permitido y el mapa](/ayuda/capturas/catalogos/areas-de-check-nueva.webp "Nombre, dirección, radio y punto en el mapa")

> **Consejo:** El radio se mide desde el centro, no desde el borde del edificio, y la ubicación de un celular puede ser aproximada. En un lugar grande (una obra, una planta), pon el punto en medio y usa un radio un poco más amplio.

## Cómo pedirle a alguien que cheque dentro de un área

1. Abre su ficha en **Gestión de personal › Empleados**, pestaña **Checador y acceso**.
2. Enciende **Checar GPS** («Requerir ubicación GPS al checar entrada/salida»).
3. Marca las **Áreas donde el empleado puede checar**. Si trabaja en varios lugares, márcalos todos.
4. Guarda la ficha.

## Cómo buscar, editar o eliminar un área

1. Filtra por **Unidad de negocio** o escribe en **Buscar por nombre de área...**.
2. Para cambiar el nombre, el punto o el radio, toca el lápiz de la tarjeta, corrige y toca **Actualizar área**. Verás «Área actualizada exitosamente».
3. Para borrarla, toca el bote rojo y confirma con **Eliminar**. Esta acción no se puede deshacer: las personas ya no podrán checar en esa ubicación.

## Preguntas frecuentes

### ¿Qué ve la persona si checa fuera de su área?

El reloj no registra la checada y le explica el motivo. Si su celular no da la ubicación, verá «Permite el acceso a ubicación y activa el GPS para checar.».

### ¿Cuántas áreas puede tener una persona?

Las que necesites: marca todas las áreas donde trabaja.

## Qué pasa si…

- **…no eliges un punto en el mapa:** verás «Debes seleccionar una ubicación en el mapa» y no se guarda.
- **…el radio es menor de 10 o mayor de 1000 metros:** verás «El radio debe estar entre 10 y 1000 metros».
- **…dejas el nombre vacío:** verás «El nombre del área es requerido».
- **…tienes elegidas todas las unidades y no eliges una:** verás «Debes seleccionar una unidad de negocio para el área».
- **…no encuentra la dirección:** verás «No se encontró la dirección». Escríbela con colonia y ciudad, o ubica el punto directo en el mapa.
- **…la búsqueda no da resultados:** verás «No se encontraron áreas» con el botón **Limpiar búsqueda**.

## Relacionado

- [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado)
- [Cómo checar desde tu celular](/ayuda/reloj-checador/checar-desde-el-celular)
- [Unidades de negocio (sucursales)](/ayuda/catalogos/unidades-de-negocio)
- [Catálogos base](/ayuda/catalogos)
