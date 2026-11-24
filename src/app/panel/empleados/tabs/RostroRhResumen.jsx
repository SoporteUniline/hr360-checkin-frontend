"use client";
// Ficha → Checador y acceso → Reconocimiento facial: lo que RH necesita para entender por qué a alguien no lo reconoce.
// - Fotos registradas y sus poses («5 fotos: Frente, Arriba, Abajo, Izquierda, Derecha»), o «1 foto (registro anterior)».
// - Últimos intentos fallidos al checar: fecha, dónde (reloj de la empresa o app), motivo claro y % de parecido.
// «Volver a registrar» es el botón de la captura guiada, justo debajo (TabReconocimiento).
// Datos: GET /checador/mi-espacio/rostro/empleado/:id (el mismo de AvisoRostroApp y ProbarRostro; misma caché SWR) trae
// `poses` ['frente', …], y GET …/empleado/:id/intentos trae { intentos: [{ id, creado_en, modo, metodo, motivo, mejor, … }] }
// (últimos 50). Sin esos datos (servidor anterior) solo se muestra lo que haya. Nunca se muestran ni descargan las huellas.
import useSWR from "swr";
import { AlertTriangle, Images } from "lucide-react";
import axios from "@/lib/axios";
import { filaIntento, resumenReferencias } from "@/lib/rostro/intentos.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const MAX_INTENTOS = 8;

export default function RostroRhResumen({ idEmpleado, tieneRostro }) {
  const { data } = useSWR(idEmpleado ? `/checador/mi-espacio/rostro/empleado/${idEmpleado}` : null, get, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const { data: datosIntentos } = useSWR(idEmpleado ? `/checador/mi-espacio/rostro/empleado/${idEmpleado}/intentos` : null, get, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const fotos = resumenReferencias(data?.poses ?? data?.referencias, tieneRostro);
  const intentos = (Array.isArray(datosIntentos?.intentos) ? datosIntentos.intentos : []).slice(0, MAX_INTENTOS).map((i) => filaIntento(i));
  if (!idEmpleado) return null;
  return (
    <div className="mt-3 grid gap-3" data-rostro-rh>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-slate-700" data-rostro-fotos>
          <Images className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="min-w-0">
            <b className="font-semibold">Fotos registradas:</b> {fotos.texto}
          </span>
        </p>
      </div>
      {fotos.anterior ? (
        <p className="text-xs text-slate-500">
          Se registró con una sola foto. Volver a registrarlo con las 5 posiciones ayuda a que lo reconozca mejor.
        </p>
      ) : null}

      <section aria-labelledby="t-intentos-rostro" data-rostro-intentos>
        <h4 id="t-intentos-rostro" className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
          Últimos intentos que no lo reconocieron
        </h4>
        {intentos.length ? (
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {intentos.map((f) => (
              <li key={f.id} className="grid gap-0.5 px-3 py-2" data-intento>
                <p className="font-medium text-slate-900">{f.motivo}</p>
                <p className="text-xs text-slate-500">
                  {f.cuando} · {f.donde} · {f.metodo}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-500">Sin intentos fallidos recientes.</p>
        )}
      </section>
    </div>
  );
}
