"use client";

// Contestar en el celular: una pregunta por pantalla, avance, botones grandes y progreso guardado en el teléfono.
// La misma pantalla sirve para la app del empleado, la liga personal (WhatsApp) y la vista previa del editor.
import { useEffect, useMemo, useState } from "react";
import {
  AVISO_PRIVACIDAD_CLIMA,
  ESCALA,
  MINIMO_NOM035,
  armarRespuesta,
  avance,
  llaveBorrador,
  pasosEncuesta,
  primeroSinResponder,
  respondido,
} from "@/lib/clima/modelo.mjs";

const leer = (llave) => {
  try {
    return JSON.parse(window.localStorage.getItem(llave) ?? "null") ?? {};
  } catch {
    return {};
  }
};
const escribir = (llave, valor) => {
  try {
    if (valor) window.localStorage.setItem(llave, JSON.stringify(valor));
    else window.localStorage.removeItem(llave);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
};

function Opcion({ activa, children, onClick, compacta = false }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`w-full rounded-2xl border-2 px-4 text-left text-[18px] font-semibold leading-snug transition-colors ${
        compacta ? "min-h-14 text-center" : "min-h-16 py-3"
      } ${activa ? "border-brand bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-800 active:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function Respuesta({ paso, valor, alElegir }) {
  const q = paso.pregunta;
  if (paso.tipo === "escala")
    return ESCALA.map((o) => (
      <Opcion key={o.valor} activa={valor === o.valor} onClick={() => alElegir(o.valor)}>
        {o.texto}
      </Opcion>
    ));
  if (paso.tipo === "sino")
    return [
      ["si", "Sí"],
      ["no", "No"],
    ].map(([v, t]) => (
      <Opcion key={v} activa={valor === v} onClick={() => alElegir(v)}>
        {t}
      </Opcion>
    ));
  if (paso.tipo === "frecuencia")
    return paso.opciones.map((o) => (
      <Opcion key={o.valor} activa={valor === o.valor} onClick={() => alElegir(o.valor)}>
        {o.texto}
      </Opcion>
    ));
  if (paso.tipo === "opcion")
    return q.opciones.map((o) => (
      <Opcion key={o.valor} activa={valor === o.valor} onClick={() => alElegir(o.valor)}>
        {o.texto}
      </Opcion>
    ));
  if (paso.tipo === "enps") {
    return (
      <div>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 11 }, (_, n) => (
            <Opcion key={n} compacta activa={valor === n} onClick={() => alElegir(n)}>
              {n}
            </Opcion>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[14px] text-slate-500">
          <span>0 · Nada probable</span>
          <span>10 · Muy probable</span>
        </div>
      </div>
    );
  }
  return (
    <label className="block">
      <span className="sr-only">Tu respuesta</span>
      <textarea
        rows={5}
        maxLength={1000}
        value={valor ?? ""}
        onChange={(e) => alElegir(e.target.value, false)}
        className="w-full rounded-2xl border-2 border-slate-200 p-3 text-[18px]"
        placeholder="Escribe aquí (opcional). Evita poner nombres."
      />
    </label>
  );
}

// pantallaCompleta: ocupa todo el alto disponible y deja «Anterior / Siguiente» fijos abajo (nada los tapa).
export default function Contestar({ encuesta, vistaPrevia = false, alEnviar, token = null, pantallaCompleta = false }) {
  const llave = vistaPrevia ? null : llaveBorrador(encuesta.id, token);
  const [r, setR] = useState({});
  const [i, setI] = useState(encuesta.tipo === "nom035" ? -1 : 0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (!llave) return;
    const previo = leer(llave);
    setR(previo);
    if (Object.keys(previo).length && encuesta.tipo !== "nom035") setI(primeroSinResponder(pasosEncuesta(encuesta, previo), previo));
  }, [llave, encuesta]);
  const pasos = useMemo(() => pasosEncuesta(encuesta, r), [encuesta, r]);
  const paso = pasos[Math.min(i, pasos.length - 1)];
  const ultimo = i >= pasos.length - 1;
  const completa = pasos.every((p) => respondido(p, r));

  const elegir = (valor, avanzar = true) => {
    const nuevo = { ...r, [paso.id]: valor };
    setR(nuevo);
    if (llave) escribir(llave, nuevo);
    if (avanzar && !ultimo) setTimeout(() => setI((x) => Math.min(x + 1, pasosEncuesta(encuesta, nuevo).length - 1)), 180);
  };
  const enviar = async () => {
    if (vistaPrevia) return;
    setEnviando(true);
    setError(null);
    try {
      await alEnviar(armarRespuesta(encuesta, r));
      escribir(llave, null);
      setListo(true);
    } catch (e) {
      setError(e?.response?.data?.error || "No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <div className="px-5 py-10 text-center" role="status">
        <p className="text-4xl" aria-hidden="true">
          🙌
        </p>
        <h2 className="mt-3 text-[24px] font-extrabold text-slate-900">¡Gracias por contestar!</h2>
        <p className="mt-2 text-[17px] text-slate-600">Tus respuestas ya se guardaron. Nadie de tu empresa las ve con tu nombre.</p>
      </div>
    );
  }
  if (i === -1) {
    const tieneG1 = encuesta.guias?.includes("I");
    const principal = encuesta.guias?.find((g) => g !== "I");
    return (
      <div className="space-y-4 px-5 py-6">
        <h2 className="text-[24px] font-extrabold leading-tight text-slate-900">{encuesta.nombre}</h2>
        <p className="text-[17px] leading-relaxed text-slate-700">
          Cuestionario oficial de la NOM-035 de la Secretaría del Trabajo. Considera tus condiciones de trabajo de los últimos dos meses; no
          hay respuestas buenas ni malas.
        </p>
        {tieneG1 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[16px] leading-relaxed text-amber-950">
            <strong>Parte 1 · Guía I (con tu nombre y confidencial).</strong> Pregunta si viviste un acontecimiento grave en el trabajo para
            poder apoyarte. Solo la ven RH y el dueño.
          </div>
        ) : null}
        {principal ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-[16px] leading-relaxed text-blue-950">
            <strong>Parte 2 · Guía {principal} (anónima).</strong> Nadie ve tu nombre junto a tus respuestas; los resultados se muestran en
            grupos de {MINIMO_NOM035} o más.
          </div>
        ) : null}
        <button type="button" onClick={() => setI(0)} className="min-h-14 w-full rounded-2xl bg-brand text-[18px] font-bold text-white">
          Empezar
        </button>
      </div>
    );
  }
  if (!paso) return <p className="p-5 text-sm text-slate-500">Esta encuesta no tiene preguntas.</p>;
  const confidencial = paso.id.startsWith("g1:");
  const pct = avance(pasos, r);

  return (
    <div className={`flex flex-col px-5 pt-4 ${pantallaCompleta ? "flex-1 pb-0" : "min-h-[70vh] pb-4"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-semibold text-slate-600">
          Pregunta {i + 1} de {pasos.length}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-[14px] font-bold ${
            confidencial ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800"
          }`}
        >
          {confidencial ? "Confidencial" : "Anónima"}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Avance"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-6 text-[13.5px] font-bold uppercase tracking-wide text-slate-500">{paso.seccion}</p>
      {paso.encabezado ? <p className="mt-2 text-[18px] leading-relaxed text-slate-700">{paso.encabezado}</p> : null}
      <h2 className="mt-2 text-[27px] font-extrabold leading-tight text-slate-900" id="pregunta-actual">
        {paso.pregunta?.texto ?? paso.texto}
      </h2>
      {paso.ayuda ? <p className="mt-2 text-[16px] text-slate-500">{paso.ayuda}</p> : null}
      {paso.tipo === "escala" ? <p className="mt-2 text-[16px] text-slate-500">Qué tan de acuerdo estás</p> : null}
      <div className="mt-5 space-y-3" role="group" aria-labelledby="pregunta-actual">
        <Respuesta paso={paso} valor={r[paso.id]} alElegir={elegir} />
      </div>
      <p className="mt-6 text-[15px] leading-relaxed text-slate-500">
        {confidencial
          ? "Esta parte va con tu nombre para poder apoyarte. Solo la ven RH y el dueño; nunca sale en reportes."
          : encuesta.tipo === "nom035"
          ? `Nadie de tu empresa ve tu nombre junto a tus respuestas. Los resultados se muestran solo en grupos de ${MINIMO_NOM035} o más personas.`
          : AVISO_PRIVACIDAD_CLIMA}
      </p>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[15px] text-red-800">
          {error}
        </p>
      ) : null}
      <div
        className={`mt-auto flex gap-3 pt-5 ${
          pantallaCompleta ? "sticky bottom-0 -mx-5 border-t border-slate-200 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))]" : ""
        }`}
      >
        <button
          type="button"
          disabled={i === 0 && encuesta.tipo !== "nom035"}
          onClick={() => setI((x) => Math.max(encuesta.tipo === "nom035" ? -1 : 0, x - 1))}
          className="min-h-14 flex-1 rounded-2xl border-2 border-slate-200 bg-white text-[17px] font-bold text-slate-700 disabled:opacity-40"
        >
          Anterior
        </button>
        {ultimo ? (
          <button
            type="button"
            disabled={!completa || enviando || vistaPrevia}
            onClick={enviar}
            className="min-h-14 flex-1 rounded-2xl bg-brand text-[17px] font-bold text-white disabled:opacity-50"
          >
            {enviando ? "Enviando…" : "Enviar respuestas"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!respondido(paso, r)}
            onClick={() => setI((x) => x + 1)}
            className="min-h-14 flex-1 rounded-2xl bg-brand text-[17px] font-bold text-white disabled:opacity-50"
          >
            Siguiente
          </button>
        )}
      </div>
      {ultimo && !completa ? (
        <p className="mt-2 text-center text-[15px] text-slate-500">Te faltan preguntas por contestar: usa «Anterior» para revisarlas.</p>
      ) : null}
    </div>
  );
}
