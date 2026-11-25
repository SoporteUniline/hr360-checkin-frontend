# Passkeys (Face ID / huella) y sesiones revocables · frontend y app

25/11/2026 · Rama `agente/passkeys` · Aprobado por el dueño. Reglas del servidor, endpoints, migración y variables del
backend: `docs/passkeys-sesiones.md` del repo del backend.

## Pantallas

- **Login** (`src/app/login/LoginClient.jsx`): debajo de «Ingresar», «Entrar con Face ID» (iPhone/iPad), «Entrar con
  huella» (Android) o «Entrar con tu passkey» (escritorio). No pide correo. El botón siempre está: no se oculta por
  `isUserVerifyingPlatformAuthenticatorAvailable` (falla en iOS 26.2 WKWebView); se intenta y, si no se puede, se
  explica (cancelado, dispositivo sin soporte, passkey quitada, servidor sin migración, demasiados intentos) y el
  formulario sigue. Con `?aviso=sesion-cerrada` muestra «Tu sesión se cerró. Vuelve a iniciar sesión.» (texto fijo).
- **Hoja «¿Activar Face ID para entrar más rápido?»** (`src/components/seguridad/OfertaPasskey.jsx`, montada en
  `ClientProviders`): solo justo después de entrar con CONTRASEÑA, si el navegador tiene WebAuthn. Activar / Ahora no
  (vuelve a preguntar en 7 días) / No volver a preguntar en este dispositivo. 🧭 Criterio: «Ahora no» espera una semana
  — porque preguntar en cada inicio cansa y no volver a preguntar nunca lo decide el botón de al lado.
- **Seguridad: dispositivos y Face ID** (`src/components/seguridad/SeguridadDispositivos.jsx`):
  `/panel/seguridad` (RH, dueño y usuarios con acceso; también sin suscripción activa), `/dashboard/seguridad` (Admin),
  `/empleado/panel/seguridad` (Mi espacio → «Seguridad y Face ID»). Passkeys (nombre, alta, último uso, renombrar,
  quitar, activar en este dispositivo) y sesiones abiertas (dispositivo, cómo entró, último uso, «Este dispositivo»,
  cerrar una, «Cerrar sesión en todos mis dispositivos»). Menú del usuario del panel: «Seguridad y Face ID».
- **Sesión cerrada desde el servidor**: `src/lib/axios.js` (instancia y axios global): 401 con `SESION_REVOCADA` o
  `SESION_EXPIRADA` → borra el token y va a `/login?aviso=sesion-cerrada`. Los demás 401 y el 503 siguen como antes.
- **Cerrar sesión** (`AuthContext.logout`): además de borrar la cookie, avisa al servidor (`POST /auth/sesiones/cerrar`,
  `keepalive`) para que ese token deje de servir.
- **Aviso de privacidad** (`src/lib/legal/documentos.js`): aviso integral y plantilla para empleados, versión
  `2026-11-25`: «ADAMIA guarda solo una llave pública y datos del dispositivo; tu cara o tu huella nunca salen de tu
  teléfono». No se reutiliza el consentimiento biométrico del reloj (la passkey no es un dato biométrico que ADAMIA reciba).

Lógica sin React: `src/lib/passkeys/modelo.mjs`; llamadas: `src/lib/passkeys/api.js` (`@simplewebauthn/browser` 13.3.0,
se carga solo al usarse).

## Token en cookie HttpOnly: no en esta rebanada

El token sigue en la cookie `token` (js-cookie) porque el JavaScript del navegador lo lee para mandarlo como
`Authorization: Bearer` al API (otro servicio; en dev y local, otro origen): `src/lib/axios.js`, `fetcher.js`, el reloj
sin conexión y varias pantallas con `Cookies.get("token")`. Con HttpOnly esas llamadas se quedarían sin token
(`middleware.jsx` y `src/app/api` sí podrían leerla, porque corren en el servidor). Siguiente paso: que el API acepte la cookie (mismo dominio en producción,
`SameSite=Lax`, protección CSRF) y quitar el Bearer. Mitigación de hoy: el token ya se puede revocar en el servidor.

## `.well-known` (asociación de dominio con la app)

Route handlers de Next (dinámicos, leen variables en tiempo de ejecución; el `middleware.jsx` no los intercepta):

| Ruta | Variable | Sin variable válida |
|---|---|---|
| `/.well-known/apple-app-site-association` → `{"webcredentials":{"apps":["<TEAMID>.mx.com.adamia.app"]}}` | `APPLE_TEAM_ID` (10 caracteres) | 404 |
| `/.well-known/assetlinks.json` → `delegate_permission/common.handle_all_urls` + `common.get_login_creds`, `mx.com.adamia.app` | `ANDROID_SHA256_FINGERPRINTS` (`AA:BB:…`, coma) | 404 |

Responden `Content-Type: application/json`, 200, sin redirecciones. En Netlify las variables van en Site settings →
Environment variables (alcance «Functions/runtime»). Después de desplegar, comprobar:

```
curl -sI https://adamia.com.mx/.well-known/apple-app-site-association   # 200, application/json, sin 301/302
curl -s  https://adamia.com.mx/.well-known/assetlinks.json
```

## App nativa (no se pudo compilar aquí)

### Android (`android/`)
- `MainActivity.java`: `WebSettingsCompat.setWebAuthenticationSupport(..., WEB_AUTHENTICATION_SUPPORT_FOR_APP)` si
  `WebViewFeature.WEB_AUTHENTICATION` está disponible (WebView 128+). En WebViews viejas no hace nada y el botón explica.
- `app/build.gradle`: `androidx.webkit:webkit:1.12.1` (la misma versión que ya usa Capacitor, minSdk 21 ≤ 24),
  `androidx.credentials:credentials:1.5.0` y `credentials-play-services-auth:1.5.0` (`variables.gradle`).
- `AndroidManifest.xml` + `res/values/strings.xml`: `asset_statements` → `https://adamia.com.mx/.well-known/assetlinks.json`.
- Revisado: XML válido; `MainActivity` compila con `javac` contra stubs de las clases usadas (la API real de androidx no
  se pudo descargar aquí: el repositorio de Google está bloqueado). ❓ PENDIENTE: compilar en Android Studio.

**Pasos (Google):**
1. Play Console → la app → Configuración → Integridad de la app → «Certificado de la clave de firma de apps»: copiar el
   **SHA-256**. Si se instala también una build firmada con la clave de subida o de depuración, copiar también esas.
2. Netlify (frontend): `ANDROID_SHA256_FINGERPRINTS=<SHA-256 de Play>[,<otras>]`. Backend: `WEBAUTHN_ANDROID_SHA256` con
   los mismos valores.
3. Comprobar `https://adamia.com.mx/.well-known/assetlinks.json` (y con la herramienta «Statement List Generator and
   Tester» de Google).
4. Nueva build (`npx cap sync android`, subir `versionCode`), probar en un teléfono con Google Play Services.

### iOS (`ios/App`)
- `App/App.entitlements`: `com.apple.developer.associated-domains` = `webcredentials:adamia.com.mx`,
  `webcredentials:dev.adamia.com.mx`; referenciado en el proyecto (`CODE_SIGN_ENTITLEMENTS` en Debug y Release).
- WebAuthn en WKWebView requiere iOS 16+; en iOS 14–15 el botón explica y se entra con contraseña.

**Pasos (Apple):**
1. developer.apple.com → Membership: copiar el **Team ID** (10 caracteres).
2. Certificates, Identifiers & Profiles → Identifiers → `mx.com.adamia.app` → activar **Associated Domains**; regenerar
   los perfiles de aprovisionamiento si se firman a mano.
3. Xcode → target App → Signing & Capabilities: elegir el equipo (Team) y comprobar que aparece «Associated Domains» con
   los dominios del archivo.
4. Netlify (frontend): `APPLE_TEAM_ID=<TEAMID>`; comprobar `https://adamia.com.mx/.well-known/apple-app-site-association`
   (Apple lo lee por su CDN; puede tardar en refrescarse).
5. Nueva build (`npx cap sync ios`, subir versión) y probar en un iPhone real.

## Pruebas

- `scripts/test-passkeys.mjs` (CI «Passkeys (Face ID / huella) y sesiones revocables — lógica»): textos por plataforma,
  mensajes de falla, sesión cerrada, la hoja (Activar / Ahora no / No volver a preguntar), fechas, `.well-known`.
- `scripts/verify-passkeys.mjs`: recorrido en Chromium con **autenticador virtual** (CDP WebAuthn) contra el **backend
  real** (`tests/helpers/servidorPasskeysE2E.cjs` del backend, base de prueba), a 1440 y 390: contraseña → activar →
  cerrar sesión (el token deja de servir) → entrar con passkey → dispositivos → renombrar → quitar → sesión revocada y
  login con aviso → la passkey quitada ya no entra. Uso en la cabecera del script.
- `scripts/verify-clima-aviso.mjs`: marca «No volver a preguntar» para que la hoja no tape su recorrido de encuestas.
