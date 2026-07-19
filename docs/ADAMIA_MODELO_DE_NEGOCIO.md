# ADAMIA — Modelo de Negocio (brief para agente comercial IA)

> Documento base extraído del análisis del repositorio `hr360-checkin-frontend`.
> Objetivo: alimentar la base de conocimiento del "Director Comercial IA" para que
> pueda construir el ICP, el embudo y la Propuesta de Valor Única (PVU).
> Fecha de extracción: 2026-07-19.

---

## 1. ¿Qué es ADAMIA?

**ADAMIA es una plataforma SaaS de Recursos Humanos en la nube**, enfocada en el
mercado mexicano. Su núcleo es el **control de asistencia biométrico** (reconocimiento
facial + validación por GPS) integrado con un **sistema completo de gestión de personal**.

- **Marca / dominios:** ADAMIA (`adamia.mx`). El producto también opera bajo el nombre
  técnico/legacy **HR360** (`hr360.mx`, `planes.hr360.mx`). *Nota estratégica: hay una
  transición de marca HR360 → ADAMIA; conviene unificar el discurso comercial.*
- **Contacto comercial actual:** `sistema@adamia.mx` · WhatsApp **+52 317 128 8029**.
- **App móvil:** existe app Android (Capacitor, `Checkin Adamia`, `com.hr360.checkin`)
  para el reloj checador en campo, además del portal web empresarial.

### Frase de una línea
> "Digitaliza tu departamento de RH: control de asistencia con reconocimiento facial + GPS,
> expediente 360 del empleado y cálculos legales laborales, en una sola plataforma."

### Módulos / funcionalidades (verificados en el código)
- **Reloj checador facial + GPS** (anti-fraude de asistencia) y reloj público / por QR.
- **Registro de entradas y salidas**, asistencias masivas y reporte de horas.
- **Expediente 360 del empleado** (panel-empleado, reconocimiento facial, documentos).
- **Vacaciones** (por ley LFT, por periodo, registro), **permisos** y **festivos**.
- **Cálculos legales mexicanos:** finiquitos y liquidaciones, **aguinaldo y PTU**, vacaciones.
- **Contratos digitales**, **actas administrativas** y **gestión documental**
  (biblioteca, plantillas y **generador de documentos con IA**).
- **Reportes personalizados** y **dashboard de RH** en tiempo real.
- **Mapa de rutas** (para personal de campo), catálogos (departamentos, puestos, unidades
  de negocio), reglas de aviso y configuración de checadores.
- **Multi-empresa (multi-tenant)** con backoffice de administración: facturación,
  empresas, contrataciones, cotizaciones, cuentas bancarias, usuarios.
- **Asistente comercial con IA ya existente** en la landing (chat widget + `/api/bot`,
  con `SALES_KNOWLEDGE_BASE`) — reutilizable por el nuevo agente.

### Stack (contexto de madurez del producto)
Next.js 15 / React 19, Capacitor (Android), `face-api.js` + `onnxruntime-web` (biometría),
Google Maps / Leaflet (GPS), MySQL. CI/CD con despliegues a dev y producción (Netlify).

---

## 2. Modelo de ingresos

**SaaS por suscripción recurrente, con precio por empleado/usuario (per-seat).**

| Concepto | Valor (según el cotizador del repo) |
|---|---|
| Precio base por usuario/mes | **$60 MXN** (`COSTO_POR_USUARIO_DEFAULT = 60`) |
| Cálculo de la mensualidad | Automático: nº de empleados × precio por usuario |
| Plan **Mensual** | 0% de descuento |
| Plan **Semestral** | ~10% de descuento |
| Plan **Anual** | ~20% de descuento |
| Prueba gratuita | **7 días, sin tarjeta, sin compromiso** |

- Los descuentos por duración se cargan dinámicamente desde backend (`planes_duracion`),
  los valores anteriores son los *defaults* del frontend.
- Monetización = **cobro recurrente mensual/semestral/anual** + módulo de facturación
  (facturas por empresa, cuentas bancarias). El upsell natural es por nº de empleados
  (crece el ticket conforme crece el cliente).
- Flujo de venta self-service (`/contratar-plan`) **y** venta asistida vía backoffice
  (`/dashboard/cotizaciones`, `/dashboard/contrataciones`) y cotizador (`/cotiza`).

---

## 3. Etapa del negocio

**Producto lanzado y en operación comercial** (más allá de MVP; en escalamiento temprano).

Evidencia en el repo:
- Arquitectura **multi-tenant** con backoffice de super-admin (alta de empresas,
  facturación, contrataciones, cotizaciones) → ya opera con **múltiples clientes reales**.
- **Onboarding self-service** completo: landing → cotizador → prueba de 7 días → alta de
  empresa → contratación con pago.
- **Clientes/logos referenciados** en la landing: **MOBLAR** (mueblero), **STT** (servicios),
  **ULTRAFARMS** (agroindustrial).
- Desarrollo activo por fases (rediseño de dashboard, expediente 360, módulos legales).

---

## 4. Cliente Ideal (ICP) — hipótesis a validar

**Modelo: B2B.** Se vende a **empresas**, no a consumidores finales.

- **Tamaño:** PyMEs y medianas empresas mexicanas (el modelo per-seat de $60/empleado
  funciona bien desde ~10 hasta cientos de empleados; el default del cotizador es 15).
- **Perfil de empresa:** organizaciones con **personal operativo/de campo + administrativo**
  que hoy controlan asistencia con métodos manuales, Excel o checadores fáciles de evadir.
- **Sectores probados (casos de éxito reales):**
  - Manufactura / mueblero (MOBLAR)
  - Servicios (STT)
  - Agroindustria / campo (ULTRAFARMS)
  - Por extensión: retail, logística/rutas, construcción — cualquier giro con rotación,
    turnos o personal disperso.
- **Buyer / decisor:** Responsable o Gerente de Recursos Humanos, Gerencia Administrativa,
  Dirección General (en PyME suele ser el dueño/director quien aprueba).
- **Geografía:** México (todo el producto está construido sobre normativa laboral mexicana:
  LFT, aguinaldo, PTU, finiquitos, RFC/CURP). Presencia inicial ligada a Jalisco (LADA 317).

### El "dolor" que resuelve (problema → solución ADAMIA)
| Dolor del mercado | Cómo lo resuelve ADAMIA |
|---|---|
| **Fraude en asistencias** (checan por otros, "amiguismo") | Biometría facial + validación GPS |
| Procesos manuales lentos y en papel | Automatización total en la nube |
| Datos de RH desorganizados en Excel | Expediente 360 centralizado y multiusuario |
| Falta de visibilidad de la operación | Dashboard y analytics en tiempo real |
| Errores/tiempo en cálculos legales | Calculadoras de finiquito, aguinaldo, PTU, vacaciones |
| Personal de campo/disperso sin control | App móvil + mapa de rutas + checado con GPS |
| Trámites y documentos laborales lentos | Contratos, actas y generador documental con IA |

---

## 5. Insumos para el Mapa de Negocio (draft)

### Propuesta de Valor Única (PVU)
> "La única plataforma de RH en México que combina **control de asistencia biométrico
> anti-fraude (facial + GPS)** con **cumplimiento legal laboral mexicano automatizado**
> (finiquitos, aguinaldo, PTU, vacaciones por ley) y un **expediente 360 del empleado**,
> lista en 5 minutos y con app para personal de campo."

Diferenciadores clave: (1) biometría facial + GPS, (2) calculadoras legales mexicanas
integradas, (3) implementación en ~5 min, (4) app móvil para campo/rutas, (5) IA
documental y asistente comercial, (6) soporte en vivo.

### Canales de adquisición (actuales, inferidos del repo)
- **Landing / web** con CTA "prueba gratis" (`adamia.mx`, `planes.hr360.mx`).
- **Chatbot comercial con IA** en la landing (ya en producción).
- **WhatsApp** comercial (+52 317 128 8029).
- **Cotizador self-service** (`/cotiza`) y **contratación self-service** (`/contratar-plan`).
- **Venta asistida** vía backoffice (cotizaciones y contrataciones internas).
- *Oportunidades no explotadas aún (para el agente): SEO/contenido legal-laboral,
  alianzas con despachos contables/nómina, referidos, outbound a sectores probados.*

### Embudo de ventas inicial (estado actual)
1. **Descubrimiento** → landing / anuncio / WhatsApp / chatbot.
2. **Interés** → chatbot IA responde funciones y precios; guía a cotizar.
3. **Consideración** → cotizador calcula mensualidad por nº de empleados.
4. **Prueba** → registro de **7 días gratis sin tarjeta** (`/alta-empresas`).
5. **Activación** → alta de empresa, carga de empleados, primer checado facial.
6. **Conversión** → contratación de plan (mensual / semestral / anual) con pago.
7. **Retención / expansión** → facturación recurrente + upsell por nº de empleados.

### Métricas comerciales sugeridas a instrumentar
Tasa de registro a prueba, activación (empresas que hacen el 1er checado), conversión
prueba→pago, ticket promedio (= empleados × $60), MRR/ARR, churn, LTV por sector.

---

## 6. Resumen ejecutivo (para pegar directo al agente comercial IA)

> **ADAMIA** es un **SaaS B2B de Recursos Humanos para México** cuyo diferenciador es el
> **control de asistencia biométrico (reconocimiento facial + GPS)** integrado con gestión
> de personal, expediente 360 y **cálculos legales laborales mexicanos** (finiquitos,
> aguinaldo, PTU, vacaciones). **Modelo de ingresos:** suscripción recurrente **por
> empleado (~$60 MXN/usuario/mes)**, con planes mensual (0%), semestral (~10% off) y anual
> (~20% off), y **prueba gratis de 7 días sin tarjeta**. **Etapa:** producto lanzado y en
> operación, multi-tenant, con clientes reales en manufactura (MOBLAR), servicios (STT) y
> agroindustria (ULTRAFARMS), en fase de escalamiento. **ICP:** PyMEs y medianas empresas
> mexicanas con personal operativo/de campo + administrativo que hoy usan métodos manuales
> o checadores evadibles; decisor = Gerencia de RH / Administración / Dirección. **Dolor
> central:** fraude en asistencias, procesos manuales y cumplimiento legal laboral.
> **Contacto:** sistema@adamia.mx / WhatsApp +52 317 128 8029.
