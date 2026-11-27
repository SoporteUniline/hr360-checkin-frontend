# Fotos a formato web al elegirlas (27/11/2026)

Aprobado por el dueño: «que la foto se convierta a web inmediatamente, todo». Origen: INC-009 (413 de nginx con fotos
de celular). Código: `src/lib/imagenes/aWeb.mjs` (reglas puras, probadas en `scripts/test-fotos-web.mjs`),
`src/lib/imagenes/lienzo.mjs` (lienzo del navegador), `src/lib/imagenes/usePrepararFoto.js` (estado «Preparando foto…»).
Verificación en navegador: `scripts/verify-fotos-web.mjs`.

## Qué hace

1. Lee los bytes: JPEG, PNG, WebP, HEIC/HEIF, AVIF o BMP. GIF y SVG no son fotos. Más de 40 MB: «demasiado grande».
2. Endereza con la orientación EXIF (si el navegador no lo hace ya; se mide una vez con un JPEG de 2×1).
3. Reduce el lado mayor según el uso y exporta:
   - formato «web»: WebP 0.82; si el navegador no codifica WebP (Safari) → JPEG; con transparencia y sin WebP → PNG.
   - formato «compatible»: JPEG, o PNG si tiene transparencia. Nunca WebP.
4. Si pesa más que el límite, baja por pasos: calidad −0.1, −0.2 y luego lado ×0.8, ×0.64, ×0.5. Si ni así: aviso.
5. Si la original ya está bien (mismo formato de salida —en los usos «compatibles», cualquier JPEG o PNG—, derecha,
   chica y ligera) se sube tal cual: no se recomprime de gusto.
6. El lienzo no copia metadatos: se quitan GPS y datos del teléfono.
7. HEIC que el navegador no abre (Chrome/Android): «Esta foto está en formato HEIC; en el iPhone ve a Ajustes › Cámara ›
   Formatos › Más compatible, o elige otra.» No se agregó librería de HEIC (pesan 1–2 MB de JS/WASM); en el iPhone,
   con `accept="image/*"`, Safari ya entrega JPEG.

| Uso | Lado mayor | Formato | Límite |
|---|---|---|---|
| portada, publicacion | 2000 px | web, 0.82 | 900,000 B |
| evidencia | 1600 px | web, 0.82 | 900,000 B |
| documento (INE, comprobante, CV, NOM-035) | 2400 px | web, 0.85 | 900,000 B |
| perfil | 1024 px | web, 0.82 | 900,000 B |
| aviso (pop-ups del sitio) | 1600 px | web, 0.82 | 900,000 B |
| activo | 1000 px | web, 0.82 | 500,000 B (va en base64 dentro del JSON) |
| logo | 1200 px | compatible, 0.9 | 900,000 B |
| whatsapp | 2000 px | compatible, 0.82 | 900,000 B |

## Dónde se aplica

| Lugar | Archivo | Uso | Nota |
|---|---|---|---|
| Portada del muro | `components/comunicados/EditorPortada.jsx` | portada | vista previa = convertida |
| Publicar en el muro (Mi espacio) | `components/comunicados/NuevaPublicacion.jsx` | publicacion | varias; dice cuál falló |
| Redactar comunicado (RH) | `components/comunicados/Redactar.jsx` | publicacion | el PDF va tal cual |
| Documentos del nuevo ingreso | `components/induccion/Preingreso.jsx` | documento | el PDF va tal cual |
| Evidencia NOM-035 | `components/clima/Nom035Expediente.jsx` | documento | el expediente PDF solo LISTA evidencias |
| Foto de evidencia de tareas | `components/tareas/MisTareasApp.jsx`, `store.jsx`, `lib/tareas/imagen.mjs` | evidencia | reemplaza el JPEG 1600 propio |
| Foto en preguntas de checklist | `components/tareas/Preguntas.jsx` | evidencia | la firma (PNG) no |
| Expediente digital (foto de un documento) | `app/panel/panel-empleado/components/PanelEmpleadoDocumentos.jsx` | documento | el SHA-256 que guarda el servidor es el de la foto convertida (la que queda) |
| Foto de perfil (panel, home, dashboard) | `app/*/cuenta/Imagen.jsx` | perfil | |
| Foto del empleado (ficha) | `app/panel/empleados/ImageUpload.jsx` | publicacion → recorte WebP | solo se ve (ficha, credencial en canvas); el rostro del checador va aparte |
| Pop-ups del sitio | `app/dashboard/popups/FormularioPopup.jsx` | aviso | |
| Fotografía de activos | `components/activos/ProductPhoto.jsx` | activo | ya era WebP; ahora con la utilidad común |
| CV con foto (vacante) | `app/(public)/vacante/[slug]/Postular.jsx` | documento | PDF tal cual |
| Documentos del formulario de entrevista | `app/(public)/postular/[token]/FormularioEntrevista.jsx` | documento | PDF/Word tal cual |
| Logo de la empresa | `app/panel/cuenta/Empresa/ImagenEmpresa.jsx`, `app/(public)/alta-empresas/ImageForm.jsx` | logo | JPEG/PNG: va en PDFs de jsPDF (`lib/pdfCompanyLogo.js` lee lo que no es JPEG como PNG) |
| Logo de sucursal | `app/panel/catalogos/unidades-de-negocio/SucursalFormDialog.jsx` | logo | JPEG/PNG por la misma razón |
| Adjuntos de WhatsApp (fotos JPEG/PNG/HEIC) | `components/whatsapp/ComposerChat.jsx` | whatsapp | JPEG/PNG: Meta trata WebP como sticker; WebP/GIF/audio/video/documentos tal cual |

## Qué NO se convierte (a propósito)

| Lugar | Por qué |
|---|---|
| Rostro para el checador (captura guiada, referencias) | biométrico: se genera con la cámara y se guarda el patrón, no pasa por estas entradas |
| Foto de evidencia del firmante (firma digital, inducción `evidencia`) | evidencia legal; el backend la acepta solo JPEG/PNG (`firmaDigitalRoutes.js`) |
| Firmas dibujadas (PNG) | se incrustan con `pdf-lib.embedPng` |
| PDFs, Word, Excel | no son fotos |
| Biblioteca de documentos (gestión documental) | documentos de la empresa, no fotos |
| Importar empleados (ZIP de fotos) | es un ZIP; lo procesa el servidor |
| `components/UploadFiles.jsx` | no lo usa ninguna pantalla |

## Backend

Todos los que reciben estas fotos ya aceptaban `image/webp` (comunicados `Ar.revisar` y la firma de bytes compartida de
`recruitment/services/whatsapp/adjuntos.js`, inducción, NOM-035, tareas por tipo, pop-ups, usuarios/empleados sin
filtro de tipo). Pruebas nuevas: `tests/fotosWebp.test.cjs` (backend). Ningún PDF del backend incrusta fotos subidas
(solo firmas PNG y el logo de ADAMIA).

## Error 413

`src/lib/errorSubida.mjs`: un 413 sin JSON (HTML de nginx) → «El archivo pesa demasiado para subirlo. Prueba con uno
más ligero.». El 413 con JSON del backend conserva su mensaje. Interceptor en `lib/axios.js` + `errorDe` de cada módulo.

## Pendientes

- Probar en iPhone/Safari y Android reales (respaldo JPEG, HEIC nativo de Safari 17+).
- Con nginx a 1 MB, una publicación con varias fotos puede pasar de 1 MB en total (cada foto < 900 KB). Se resuelve
  cuando Luis suba `client_max_body_size` a 25M; mientras, el mensaje es claro.
- Si el API se sirve desde otro origen, el 413 de nginx sin CORS llega como «Sin conexión».
