---
titulo: Seguridad, Face ID y sesiones abiertas
resumen: Entra sin contraseña con Face ID, huella o passkey, renombra o quita tus dispositivos y cierra sesiones abiertas en otros equipos.
modulo: seguridad
audiencia: [rh, dueno, jefe, empleado]
pantallas: [/panel/seguridad, /empleado/panel/seguridad]
palabras: [seguridad, face id, huella, passkey, entrar sin contraseña, dispositivos, sesiones abiertas, cerrar sesión, cerrar todas las sesiones, quitar dispositivo]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/seguridad/SeguridadDispositivos.jsx, src/components/seguridad/OfertaPasskey.jsx, src/lib/passkeys/modelo.mjs, src/app/panel/seguridad/page.jsx, src/app/empleado/panel/seguridad/page.jsx]
---

## Para qué sirve

En **Seguridad** activas el acceso sin contraseña (Face ID en iPhone, huella en Android o una passkey en tu computadora) y revisas en qué dispositivos está abierta tu cuenta. Si ves uno que no reconoces, lo cierras desde aquí.

> **Consejo:** Tu cara o tu huella **nunca salen de tu teléfono**: ADAMIA solo guarda una llave pública. Por eso es más seguro que una contraseña.

## Quién la usa

Todos: RH, el dueño, los usuarios con acceso y los empleados. Esta pantalla siempre está disponible, aunque la cuenta de la empresa tenga la suscripción vencida.

## Antes de empezar

- Usa un navegador moderno o el navegador de tu celular. En la app de ADAMIA esta función llega en una próxima versión: mientras, actívala desde el navegador en adamia.com.mx.
- Tu teléfono o computadora debe tener bloqueo de pantalla (Face ID, huella, PIN o contraseña del equipo).

## Cómo entrar a Seguridad

- **Panel de RH:** abre el menú de tu usuario (abajo a la izquierda) y elige **Seguridad y Face ID**.
- **Mi espacio (empleados):** toca **Seguridad y Face ID** («Entra sin contraseña y revisa tus dispositivos»).

![Pantalla de seguridad en el panel](/ayuda/capturas/seguridad/seguridad-panel.webp "Tus dispositivos con Face ID o passkey y tus sesiones abiertas")

## Cómo activar Face ID, huella o passkey

1. En **Face ID, huella y passkeys** presiona **Activar en este dispositivo**.
2. Tu teléfono o computadora te pide confirmar con tu cara, tu huella o tu bloqueo de pantalla.
3. Verás «Listo: ya puedes entrar con Face ID en este dispositivo.» (o huella, o passkey) y el dispositivo aparece en la lista.

La próxima vez, en la pantalla de inicio de sesión presiona **Entrar con Face ID**, **Entrar con huella** o **Entrar con tu passkey**.

> **Consejo:** Justo después de entrar con contraseña, ADAMIA te puede ofrecer «¿Activar Face ID para entrar más rápido?». Elige **Activar**, **Ahora no** (te vuelve a preguntar en una semana) o **No volver a preguntar en este dispositivo**.

## Cómo renombrar o quitar un dispositivo

1. En la lista de dispositivos ves su nombre, cuándo se agregó y su último uso.
2. Presiona **Renombrar**, escribe un nombre que reconozcas («iPhone de Laura») y **Guardar**.
3. Para quitarlo presiona **Quitar** y confirma. Ya no podrás entrar con ese dispositivo sin contraseña y se cerrarán las sesiones que se abrieron con él.

## Cómo cerrar sesiones abiertas

1. En **Sesiones abiertas** ves cada dispositivo donde tu cuenta está abierta, si entró con contraseña o con passkey y su último uso. El tuyo dice **Este dispositivo**.
2. Para cerrar otro, presiona **Cerrar** y confirma con **Cerrar sesión**. Ese dispositivo tendrá que volver a entrar.
3. Si sospechas que alguien más entró, presiona **Cerrar sesión en todos mis dispositivos** y confirma con **Cerrar todas**. Se cierran todas, incluida la tuya.

![Seguridad y Face ID en el celular](/ayuda/capturas/seguridad/seguridad-celular.webp "La misma pantalla en Mi espacio")

> **Importante:** Si no reconoces un dispositivo, ciérralo y **cambia tu contraseña**.

## Preguntas frecuentes

### ¿Puedo seguir entrando con mi contraseña?

Sí. Face ID y la huella son una opción más; tu contraseña sigue funcionando.

### ¿Lo tengo que activar en cada dispositivo?

Sí. Cada teléfono o computadora se activa por separado y aparece en tu lista.

### ¿Por qué no veo sesiones antiguas?

Las sesiones se registran desde que entras de nuevo. Si dice «No hay otras sesiones registradas», no hay más dispositivos activos registrados.

## Qué pasa si…

- **…aparece «Para administrar Face ID o huella vuelve a iniciar sesión con tu contraseña.».** Sal y entra con tu contraseña; luego vuelve a Seguridad.
- **…se canceló o se agotó el tiempo al activar.** Verás un aviso; puedes intentarlo otra vez o seguir entrando con tu contraseña.
- **…quitas el dispositivo con el que entraste en esta sesión.** Esta sesión se cierra y vuelves a la pantalla de inicio.
- **…no se pudo consultar la información.** Verás «No pudimos consultar toda la información.» con el botón **Reintentar**.

## Relacionado

- [Cómo entrar a ADAMIA y recuperar tu contraseña](/ayuda/primeros-pasos/iniciar-sesion)
- [Conoce tu espacio en ADAMIA](/ayuda/mi-espacio/conoce-tu-espacio)
- [Cómo dar acceso al panel a otra persona](/ayuda/usuarios/dar-acceso-a-tu-equipo)
- [Mis recibos de pago](/ayuda/nomina/mis-recibos-de-pago)
