// Documentación pública de la API de integración v1 (26/12/2026). Contenido en src/lib/integraciones/integraciones.mjs;
// contrato completo en el backend (docs/openapi-integracion-v1.json, servido en /api/integracion/v1/openapi.json).
// Sin datos de ninguna empresa: es estática. Bloques de código con salto de línea (sin scroll horizontal en el teléfono).
import Link from "next/link";
import {
  CAMPOS_EMPLEADO, ERRORES, LIMITE_POR_MINUTO, MAX_DIAS_ASISTENCIAS, PERMISOS, RESPUESTA_ASISTENCIAS, RESPUESTA_EMPLEADOS,
  RESPUESTA_ERROR, ejemplos, urlBaseApi,
} from "@/lib/integraciones/integraciones.mjs";

export const metadata = {
  title: "API para desarrolladores | ADAMIA",
  description: "API de integración de ADAMIA: empleados y asistencias por empresa, con llaves de API, límites y ejemplos curl.",
};

const BASE = urlBaseApi(process.env.NEXT_PUBLIC_RUTA_BACKEND);
const EJ = ejemplos(process.env.NEXT_PUBLIC_RUTA_BACKEND);
const SECCIONES = [
  ["inicio", "Inicio rápido"], ["autenticacion", "Autenticación"], ["permisos", "Permisos"], ["empleados", "Empleados"],
  ["asistencias", "Asistencias"], ["paginacion", "Paginación"], ["limites", "Límites"], ["errores", "Errores"],
  ["idempotencia", "Idempotencia"], ["obsoletos", "Endpoints viejos"],
];

function Codigo({ children, etiqueta }) {
  return (
    <figure className="min-w-0">
      {etiqueta ? <figcaption className="mb-1 text-[13px] font-semibold text-slate-500">{etiqueta}</figcaption> : null}
      <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-900 p-4 font-mono text-[13px] leading-6 text-slate-100 [overflow-wrap:anywhere]"><code>{children}</code></pre>
    </figure>
  );
}

function Seccion({ id, titulo, children }) {
  return (
    <section id={id} aria-labelledby={`t-${id}`} className="scroll-mt-24 space-y-3">
      <h2 id={`t-${id}`} className="text-xl font-extrabold tracking-tight text-slate-900">{titulo}</h2>
      {children}
    </section>
  );
}

function Endpoint({ metodo, ruta, permiso, children }) {
  const color = metodo === "GET" ? "bg-emerald-100 text-emerald-800" : metodo === "POST" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-900";
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 font-mono text-[13px] font-bold ${color}`}>{metodo}</span>
        <code className="break-all font-mono text-[14px] font-semibold text-slate-900">{ruta}</code>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[13px] text-slate-600">{permiso}</span>
      </p>
      {children}
    </div>
  );
}

const p = "text-[15px] leading-7 text-slate-700";
const li = "text-[15px] leading-7 text-slate-700";

export default function PaginaDesarrolladores() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <header className="bg-gradient-to-br from-[#1e3a8a] to-[#2563EB] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[13px] font-bold">API v1 · Integración por empresa</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">API para desarrolladores</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/90">
            Conecta tu nómina, ERP o control de acceso con ADAMIA: consulta, crea y actualiza empleados y consulta asistencias por fecha. Cada llave pertenece a una sola empresa y solo puede lo que su dueño le permite.
          </p>
          <code className="mt-4 block break-all font-mono text-[13px] text-white/90">{BASE}</code>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Contenido" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {SECCIONES.map(([id, t]) => (
              <li key={id}><a href={`#${id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-[14px] font-semibold text-slate-700 hover:bg-white hover:text-[#2563EB] lg:min-h-9">{t}</a></li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 space-y-12">
          <Seccion id="inicio" titulo="Inicio rápido">
            <ol className="list-decimal space-y-1 pl-5">
              <li className={li}>El dueño de la cuenta entra al panel → <b>Ajustes → Integraciones</b> y crea una llave con los permisos que necesitas.</li>
              <li className={li}>Copia la llave (<code className="font-mono text-[13px]">adk_live_…</code>): se muestra <b>una sola vez</b>. Guárdala en las variables de tu servidor.</li>
              <li className={li}>Haz tu primera petición:</li>
            </ol>
            <Codigo>{EJ.listar}</Codigo>
            <p className={p}>Contrato completo (OpenAPI 3): <a className="inline-flex min-h-11 items-center break-all font-semibold text-[#2563EB] underline" href={`${BASE}/openapi.json`}>{`${BASE}/openapi.json`}</a></p>
          </Seccion>

          <Seccion id="autenticacion" titulo="Autenticación">
            <p className={p}>Manda la llave en la cabecera <code className="font-mono text-[13px]">Authorization: Bearer &lt;llave&gt;</code> (o <code className="font-mono text-[13px]">X-API-Key: &lt;llave&gt;</code>). Solo por HTTPS.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li className={li}><b>Nunca en la URL.</b> Una llave en <code className="font-mono text-[13px]">?apiKey=</code> se rechaza con 400 <code className="font-mono text-[13px]">LLAVE_EN_URL</code>: revócala, porque las URL quedan en bitácoras.</li>
              <li className={li}>La empresa la define la llave. Un id de otra empresa responde 404.</li>
              <li className={li}>Revocar es inmediato. Las llaves pueden vencer (30, 90 o 365 días, o sin vencimiento).</li>
              <li className={li}>Nunca pongas la llave en una app móvil ni en el navegador: úsala solo desde tu servidor.</li>
            </ul>
          </Seccion>

          <Seccion id="permisos" titulo="Permisos">
            <ul className="grid gap-2 sm:grid-cols-3">
              {PERMISOS.map((x) => (
                <li key={x.clave} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <code className="font-mono text-[13px] font-bold text-slate-900">{x.clave}</code>
                  <p className="mt-1 text-[14px] font-semibold text-slate-800">{x.nombre}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{x.descripcion}</p>
                </li>
              ))}
            </ul>
            <p className={p}>Sin el permiso: 403 <code className="font-mono text-[13px]">PERMISO_INSUFICIENTE</code> con <code className="font-mono text-[13px]">permiso_requerido</code>.</p>
          </Seccion>

          <Seccion id="empleados" titulo="Empleados">
            <Endpoint metodo="GET" ruta="/empleados" permiso="empleados:leer">
              <p className={p}>Filtros: <code className="font-mono text-[13px]">activo</code> (true/false), <code className="font-mono text-[13px]">sucursal</code>, <code className="font-mono text-[13px]">departamento</code>, <code className="font-mono text-[13px]">buscar</code> (nombre, correo o nip), <code className="font-mono text-[13px]">actualizado_desde</code> (ISO 8601, para sincronizar solo lo que cambió).</p>
              <Codigo etiqueta="Petición">{EJ.listar}</Codigo>
              <Codigo etiqueta="Respuesta 200">{RESPUESTA_EMPLEADOS}</Codigo>
            </Endpoint>
            <Endpoint metodo="GET" ruta="/empleados/{id}" permiso="empleados:leer"><Codigo>{EJ.uno}</Codigo></Endpoint>
            <Endpoint metodo="POST" ruta="/empleados" permiso="empleados:escribir">
              <p className={p}>Mismas reglas que el alta del panel. Responde 201 con <code className="font-mono text-[13px]">Location</code>.</p>
              <Codigo>{EJ.crear}</Codigo>
            </Endpoint>
            <Endpoint metodo="PATCH" ruta="/empleados/{id}" permiso="empleados:escribir">
              <p className={p}>Solo cambia los campos que mandas. Para dar de baja: <code className="font-mono text-[13px]">{'{"estado":"Baja","fecha_baja":"2026-12-20","motivo_baja":"Renuncia"}'}</code>.</p>
              <Codigo>{EJ.actualizar}</Codigo>
            </Endpoint>
            <div className="rounded-2xl border border-slate-200 bg-white">
              <h3 className="border-b border-slate-100 px-4 py-3 text-[15px] font-bold text-slate-900">Campos</h3>
              <ul className="divide-y divide-slate-100">
                {CAMPOS_EMPLEADO.map((c) => (
                  <li key={c.campo} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[180px_150px_minmax(0,1fr)] sm:gap-3">
                    <code className="font-mono text-[13px] font-semibold text-slate-900">{c.campo}{c.obligatorio ? <span className="text-red-600" title="Obligatorio al crear"> *</span> : null}</code>
                    <span className="text-[13px] text-slate-500">{c.tipo}</span>
                    <span className="text-[13px] text-slate-700">{c.nota}</span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-slate-100 px-4 py-3 text-[13px] text-slate-600">* Obligatorio al crear. La API <b>nunca</b> lee ni escribe contraseña, PIN de firma, rostro, nómina ni cuentas bancarias (responde 422). La empresa siempre es la de la llave.</p>
            </div>
          </Seccion>

          <Seccion id="asistencias" titulo="Asistencias">
            <Endpoint metodo="GET" ruta="/asistencias" permiso="asistencias:leer">
              <p className={p}><code className="font-mono text-[13px]">fecha=AAAA-MM-DD</code>, o <code className="font-mono text-[13px]">desde</code> y <code className="font-mono text-[13px]">hasta</code> (máximo {MAX_DIAS_ASISTENCIAS} días). Opcional <code className="font-mono text-[13px]">empleado</code>. Mismo cálculo que el panel: Presente, Tardanza o Ausente con la tolerancia de tu empresa, checadas, permisos y horas extra.</p>
              <p className={p}>Horas en ISO 8601 con el desfase de la zona horaria de la empresa (p. ej. <code className="font-mono text-[13px]">2026-12-15T09:05:00-06:00</code>); el horario programado en <code className="font-mono text-[13px]">HH:mm</code> locales.</p>
              <Codigo etiqueta="Por fecha">{EJ.asistencias}</Codigo>
              <Codigo etiqueta="Rango y empleado">{EJ.rango}</Codigo>
              <Codigo etiqueta="Respuesta 200">{RESPUESTA_ASISTENCIAS}</Codigo>
            </Endpoint>
          </Seccion>

          <Seccion id="paginacion" titulo="Paginación">
            <p className={p}><code className="font-mono text-[13px]">pagina</code> (desde 1) y <code className="font-mono text-[13px]">por_pagina</code> (empleados hasta 200, asistencias hasta 500). Cada lista trae <code className="font-mono text-[13px]">paginacion: {"{ pagina, por_pagina, total, total_paginas }"}</code>. El orden es estable (empleados por id; asistencias por fecha, nombre e id).</p>
          </Seccion>

          <Seccion id="limites" titulo="Límites">
            <p className={p}>{LIMITE_POR_MINUTO} peticiones por minuto por llave. Cada respuesta trae <code className="font-mono text-[13px]">RateLimit-Limit</code>, <code className="font-mono text-[13px]">RateLimit-Remaining</code> y <code className="font-mono text-[13px]">RateLimit-Reset</code>. Al pasarte: 429 con <code className="font-mono text-[13px]">Retry-After</code> (segundos). Varias llaves inválidas seguidas desde la misma IP también se frenan un minuto.</p>
            <p className={p}>Cada petición queda en la bitácora que ve el dueño (método, ruta, resultado y tiempo; nunca los datos enviados) y trae <code className="font-mono text-[13px]">X-Request-Id</code>.</p>
          </Seccion>

          <Seccion id="errores" titulo="Errores">
            <Codigo>{RESPUESTA_ERROR}</Codigo>
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {ERRORES.map((e) => (
                <li key={e.codigo} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[60px_240px_minmax(0,1fr)] sm:gap-3">
                  <span className="font-mono text-[13px] font-bold text-slate-900">{e.http}</span>
                  <code className="break-all font-mono text-[13px] text-slate-800">{e.codigo}</code>
                  <span className="text-[13px] text-slate-600">{e.cuando}</span>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion id="idempotencia" titulo="Idempotencia">
            <p className={p}>En <code className="font-mono text-[13px]">POST /empleados</code> manda <code className="font-mono text-[13px]">Idempotency-Key</code> (8 a 100 caracteres, única por alta). Si repites la misma petición en 24 horas (por un corte de red), recibes el mismo 201 con <code className="font-mono text-[13px]">Idempotent-Replayed: true</code> y no se crea otro empleado. La misma clave con otro contenido: 422 <code className="font-mono text-[13px]">IDEMPOTENCIA_CONFLICTO</code>.</p>
          </Seccion>

          <Seccion id="obsoletos" titulo="Endpoints viejos (obsoletos)">
            <p className={p}><code className="font-mono text-[13px]">/api/checador/empleados/admin</code> y <code className="font-mono text-[13px]">/api/checador/asistencias/admin</code> con <code className="font-mono text-[13px]">?apiKey=</code> están obsoletos: responden con la cabecera <code className="font-mono text-[13px]">Deprecation</code> y se apagarán. Cámbiate a la v1 con una llave de tu empresa.</p>
          </Seccion>

          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-[14px] text-slate-700">¿Dudas? Escríbenos desde <Link href="/contacto" className="inline-flex min-h-11 items-center font-semibold text-[#2563EB] underline">contacto</Link> e incluye el <code className="font-mono text-[13px]">id_peticion</code> del error.</p>
        </article>
      </div>
    </div>
  );
}
