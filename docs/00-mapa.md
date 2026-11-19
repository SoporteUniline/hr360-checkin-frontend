# Mapa del sistema — ADAMIA (frontend `hr360-checkin-frontend`)
> Inventario FASE 1 · 2026-11-13 · agente auditor · solo lectura del código de este repo.
> Certeza: ✅ visto en BD y en código · 🟡 visto solo en código (o solo en SQL de docs) · ❓ desconocido.

## Arquitectura real
| Pieza | Qué es | Certeza |
|---|---|---|
| Frontend | Next.js (App Router, `output: standalone`) + Capacitor (`mx.com.adamia.app`, WebView remota a adamia.com.mx) | ✅ código |
| Backend principal | API REST externa `NEXT_PUBLIC_RUTA_BACKEND` (`/checador/*`, `/users/*`, `/empresas/*`, `/stripe/*`…). Repo `redlab_back` — **no disponible en esta sesión** | 🟡 |
| Base de datos | MySQL/InnoDB utf8mb4 (`adamia_dev` en desarrollo) | 🟡 (SQL en `docs/*.sql`) |
| Acceso directo a BD desde este repo | `src/config/database.js` (empresas, usuarios_empresas) y `src/lib/activos/server/database.js` (tablas `cau_*`) vía rutas `src/app/api/*` | ✅ código |
| Autenticación | JWT del backend en cookie `token` (js-cookie, 365 días); `middleware.jsx` lo verifica con `JWT_SECRET` y enruta por `tipo_usuario` | ✅ código |
| Roles | `Admin` (back-office `/dashboard`), `Recruiter`/`User` (RH de empresa, `/panel`), `Empleado` (`/empleado`). Sin permisos finos por módulo en el frontend | ✅ código |
| Multiempresa | Sin encabezado global; cada pantalla envía `empresa`/`id_empresa` como parámetro. El aislamiento real depende del backend | 🟡 |
| Despliegue | GitHub Actions → imagen Docker → AWS Lightsail (`ci-dev` en push a `dev`, `deploy-prod` manual en `main`, rollbacks) | ✅ código |
| Pruebas | Solo `scripts/test-activos-*.mjs` corren en CI dev; prod solo lint | ✅ código |

## Módulos
| Módulo | Rutas | Datos (endpoints / tablas) | Depende de | % conocimiento |
|---|---|---|---|---|
| Auth y sesión | `/login`, `/recuperacion`, `middleware.jsx`, `AuthContext` | `/users/login`, `/users/verify/token`, `/otp/*`, `/users/update-password-recovery/{email}` | empresas | 70% |
| Empresas y suscripción | `/[slug]`, `/seleccionar-reloj`, `panel/layout.jsx`, `/api/empresas/*` | `empresas`, `usuarios_empresas` (MySQL directo), `/stripe/mi-suscripcion` | — | 60% |
| Catálogos | `/panel/catalogos/*` | `/checador/{departamentos,puestos,estados-civiles,sucursales,tiposPermiso,area_check2}` | empresas | 75% |
| Empleados (expediente) | `/panel/empleados` (tabs Personales, Laborales, Jornada, Nómina, GPS, Reconocimiento, Cuentas, Contactos) | `/checador/empleados*`, importación, sincronización con checador | catálogos, turnos, campos personalizados | 60% |
| Campos personalizados | `/panel/campos-personalizados` | `/checador/campos-personalizados` | empleados | 75% |
| Turnos | `/panel/turnos`, `TabJornada` | `/checador/turnos`, `/turnos/:id/asignar`, `DELETE /empleados/:id/turno` (un solo `id_turno` por empleado, sin vigencia) | empleados | 50% |
| Checador / reloj | `RelojChecador`, `/empleado/reloj-checador`, `/reloj-publico`, `/[slug]` | `/checador/reloj/{registrar,registrar-facial,registros-del-dia,eventos-checada(SSE),asistencia,actualizar}` | empleados, empresas, áreas | 45% |
| Asistencia | `/panel/registro-asistencia`, `/panel/registro-de-entradas-y-salidas` | `/checador/asistencias`, `PUT /asistencias/:id`; horas calculadas en UI (`src/utils/asistenciaHoras.js`) | checador, turnos, config | 45% |
| Configuración checador | `/panel/configuracion-checador` | `/checador/config-checador` (tolerancias, jornada mínima), `aplicar-historico` | asistencia | 60% |
| Incidencias | `/panel/incidencias` | Derivadas en navegador desde `/checador/asistencias`; aprobación de extra vía PUT en bucle | asistencia, permisos | 50% |
| Reporte de horas | `/panel/reporte-horas` | `/checador/reportes/horas` por empleado; sumas en cliente | asistencia | 50% |
| Festivos | `/panel/festivos` | `/checador/holidays` | empresas | 70% |
| Permisos | `/panel/permisos` | `/checador/solicitudes-permiso*`, días calculados en cliente (`lib/permisosDias.js`) | empleados, festivos, tiposPermiso | 65% |
| Vacaciones | `/panel/vacaciones/*` | `/checador/vacaciones*`, `vacaciones-ley`, `vacaciones-periodo` | empleados, permisos | 55% |
| Aguinaldos | `/panel/aguinaldos` | `/checador/aguinaldos*` (`/calcular` en backend) | empleados, asistencia | 45% |
| Finiquitos | `/panel/finiquitos-y-liquidaciones` | `/checador/finiquitos*` (`/calcular` en backend) | empleados, vacaciones | 45% |
| Contratos | `/panel/contratos` | `/checador/contratos*` | empleados, puestos | 55% |
| Actas administrativas | `/panel/actas-administrativas` | `/checador/administrativeMinutes*`, `tipos-actas` | empleados | 60% |
| Gestión documental y firma | `/panel/gestion-documental/*`, `/firmar/[token]` | `/checador/gestion-documental*`, `/checador/firma-digital/*`, `/api/bot` (IA) | empleados, empresas | 50% |
| Panel empleado / expediente digital | `/panel/panel-empleado` | `/checador/empleados/panel-empleado/*`, expediente categorías/documentos | empleados | 50% |
| Portal del empleado | `/empleado/panel/*` | permisos, vacaciones, asistencia, recursos, evaluaciones | empleados | 55% |
| Control de activos y uniformes | `/panel/control-activos/*`, `/panel/control-uniformes`, `/api/control-activos` | MySQL directo `cau_*` (15 tablas, idempotencia, bitácora de movimientos) | empleados, puestos, sucursales | 85% |
| Solicitudes de equipo | `/panel/solicitudes-equipo`, `/api/solicitudes-equipo` | BFF sobre `/checador/solicitudes-permiso*` | permisos, empleados | 60% |
| Evaluaciones de desempeño | `/panel/evaluaciones`, `/empleado/panel/evaluaciones` | `/api/checador/evaluaciones-desempeno/*` (esquema propuesto `performance_*`) | empleados, puestos | 50% |
| Reclutamiento | `/panel/reclutamiento/*` (demo en localStorage, flag), `/vacante/[slug]`, `/bolsa-de-trabajo` | `/vacantes/*`, `/postulaciones/*` | empresas | 60% |
| Mapa de rutas | `/panel/mapa-de-rutas` | `/checador/mapa-rutas/*` | checador | 50% |
| Reportes personalizados | `/panel/reportes-personalizados` (+ `/debug`) | `/checador/reportes-personalizados`, asistencias | asistencia | 55% |
| Back-office Admin | `/dashboard/*` | empresas, facturación Stripe, usuarios, checadores (Hikvision), cupones, cuentas bancarias, mensajes del sistema | — | 60% |
| Sitio público | `(landing)`, `(public)/*` | alta de empresas, cotiza, contratar-plan, bot | — | 80% |

## Tablas conocidas (solo las visibles desde este repo)
| Tabla | Para qué | Certeza |
|---|---|---|
| empresas (`id_empresa`, `estado`, `id_usuario`, `slug`) | empresa cliente | 🟡 consulta en `src/lib/db-queries.js` |
| usuarios_empresas (`id_usuario`, `id_empresa`, `estado`) | pertenencia usuario–empresa | 🟡 |
| cau_* (15 tablas) | control de activos y uniformes | ✅ `docs/015_*.sql`, `016_*.sql` + `src/lib/activos/server` |
| performance_* (21 tablas) | evaluaciones — **propuesto, no ejecutado** | 🟡 `docs/evaluaciones/schema-propuesto.sql` |
| asistencias, checadas, turnos, empleados, config_checador, festivos, permisos… | ❓ solo conocidas por su API; esquema en el backend | ❓ |

## Orden de auditoría sugerido (por dependencia)
1. Auth/sesión y multiempresa (todo depende de esto) · 2. Empleados · 3. Turnos + Checador + Asistencia + Incidencias (base de la funcionalidad de jornadas) · 4. Permisos/Vacaciones/Festivos · 5. Aguinaldos/Finiquitos (dinero) · 6. Resto.
