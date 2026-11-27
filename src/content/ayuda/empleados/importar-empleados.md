---
titulo: Cómo importar empleados desde Excel
resumen: Da de alta a muchas personas a la vez con la plantilla de Excel de ADAMIA y, si quieres, sus fotos en un archivo ZIP.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [importar, excel, xlsx, carga masiva, plantilla, zip, fotos, alta masiva, migrar]
orden: 40
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/ImportarEmpleadosDialog.jsx, src/app/panel/empleados/page.jsx]
---

## Para qué sirve

Si vas a empezar a usar ADAMIA o contrataste a varias personas, no tienes que capturarlas una por una. Descargas una plantilla de Excel, la llenas y la subes. Puedes incluir sus fotos de perfil en un archivo ZIP.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Elige una **empresa específica** en el filtro **Unidad de negocio** de la pantalla Empleados. Con **Todas las empresas** el botón `Importar empleados` está desactivado.
- Usa **siempre la plantilla que descargas de ADAMIA**: trae los catálogos y turnos disponibles de tu empresa.
- Si vas a subir fotos, nombra cada foto con el **correo exacto** del empleado, por ejemplo `juan@empresa.com.jpg`. De preferencia fotos cuadradas.

## Cómo importar el Excel

1. Entra a **Gestión de personal → Empleados** y toca `Importar empleados`.
2. En **1. Descargar plantilla**, toca `Descargar`.
3. Abre el Excel y llena una fila por persona. Respeta los encabezados.
4. En **2. Archivo Excel**, toca **Seleccionar plantilla completada** y elige tu archivo `.xlsx`.
5. (Opcional) En **3. Fotos de perfil**, toca **Seleccionar ZIP de fotografías** y elige tu `.zip` (máximo 20 MB).
6. Toca `Importar empleados` y espera.
7. Revisa el resultado: **Insertados**, **Omitidos** y, si hubo, la lista de **Errores** por fila y de **Fotos no asociadas**.

![Ventana Importar empleados con sus tres pasos](/ayuda/capturas/empleados/importar-empleados.webp "Plantilla, archivo de Excel y fotos opcionales")

## Errores comunes en el Excel

Cada fila con problema se **omite** y te dice por qué. Los motivos más comunes:

| Mensaje | Cómo se corrige |
| --- | --- |
| Falta «…» | Llena la columna obligatoria que indica. |
| «Correo» no tiene un formato válido | Revisa que tenga @ y dominio, sin espacios. |
| El correo está duplicado dentro del mismo archivo | Cada persona necesita su propio correo. |
| El correo ya está registrado como empleado / como usuario | Esa persona ya existe; búscala en Empleados (también en Inactivos). |
| Falta «Días Laborales», «Hora de Entrada» u «Hora de Salida» (o selecciona un «Turno») | Pon el horario o elige un turno de la lista. |
| «Hora de Entrada» debe tener formato HH:mm (24h) | Escribe las horas como 09:00 o 18:30. |
| «Fecha de Ingreso» no es una fecha válida (usa DD/MM/AAAA) | Escribe la fecha como 04/03/2024. |
| «CURP» debe tener 18 caracteres / «RFC» entre 12 y 13 / «NSS» 11 dígitos | Corrige la longitud. |
| Falta «Banco» porque se capturó información bancaria | Si pones número de cuenta, también pon el banco. |

Corrige las filas omitidas en el mismo Excel y vuelve a importar solo esas.

## Fotos que no se asocian

| Mensaje | Qué significa |
| --- | --- |
| No coincide con ningún correo del archivo | El nombre de la foto no es el correo de alguien del Excel. |
| El nombre del archivo debe ser el correo del empleado | Renombra la foto con el correo. |
| Extensión no soportada (usa .jpg, .jpeg o .png) | Convierte la foto a JPG o PNG. |
| Supera el tamaño máximo de 5 MB | Reduce el tamaño de la foto. |

## Preguntas frecuentes

### ¿Puedo importar a personas que ya existen para actualizarlas?

No. La importación es solo para altas nuevas. Si el correo ya existe, esa fila se omite. Para cambiar datos, edita la ficha de cada persona.

### ¿Se mandan a los relojes checadores?

Sí: al terminar la importación, el sistema manda a los relojes a las personas nuevas en una sola pasada. Revisa la columna **Sincronización**; si alguien queda pendiente, usa [Sincronizar con reloj](/ayuda/empleados/sincronizar-con-reloj).

### ¿Les llega su contraseña para la app?

No automáticamente. Genera su contraseña desde la llave de **Acciones**. Ve [Cómo cambiar la contraseña de un empleado](/ayuda/empleados/contrasena-del-empleado).

## Qué pasa si…

- **…subo un archivo que no es la plantilla:** verás «No se pudo leer el archivo Excel. Verifica que sea un .xlsx válido generado con la plantilla oficial.»
- **…dejo filas de ejemplo o vacías:** se ignoran.
- **…el ZIP está dañado:** las personas se importan, pero ninguna foto se asocia. Vuelve a comprimir las fotos y súbelas cambiando la foto en cada ficha.
- **…una fila falla al guardarse:** aparece en **Errores** con su número de fila; las demás filas sí se registran.

## Relacionado

- [Cómo dar de alta a un empleado](/ayuda/empleados/dar-de-alta)
- [Empleados: tu plantilla en una sola pantalla](/ayuda/empleados)
