# INC-005 · El formulario público debe mandar el token de verificación del teléfono (24/11/2026) — backend: INC-REC-002

- **Contexto:** el backend ya no acepta `POST /postulaciones/create` sin `telefono_verificacion_token` (token de un solo
  uso que entrega `/otp/verify`). Antes el teléfono no se validaba en el servidor.
- **RED:** `scripts/test-postulacion-token.mjs` sobre 7456413 falla: `OTPForm` no pasaba el token y el formulario no lo enviaba.
- **Corrección:** `OTPForm.jsx` pasa `response.data.verification_token` a `onSubmit`; `ApplicationForm/index.jsx` lo agrega
  al `FormData` (solo si es texto: `handleSubmit` pasa el evento como segundo argumento).
- **GREEN:** `test-postulacion-token.mjs` 1/1.
- **Despliegue:** publicar junto con el backend (con backend nuevo y frontend viejo, las postulaciones sin sesión fallan con 400).
