"use client";
// Vista de la captura guiada en 5 poses: cámara en espejo con óvalo, flecha hacia donde moverse, «2 de 5», avance por
// pose, mensaje en vivo y botones Cancelar / Reintentar / Saltar este paso. La usan la ficha de RH, Mi rostro y la
// página del celular (QR); la lógica vive en useCapturaRostro (registrarGuiado) y src/lib/rostro/poses.mjs.
// El video se ve en espejo (como una selfie): «a tu izquierda» es hacia la izquierda de la pantalla.
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw } from "lucide-react";
import { POSES_GUIADAS } from "@/lib/rostro/poses.mjs";
import { TONO_GUIA } from "@/lib/rostro/guia.mjs";

const FLECHA = {
  arriba: { Icono: ArrowUp, lugar: "left-1/2 top-2 -translate-x-1/2" },
  abajo: { Icono: ArrowDown, lugar: "bottom-2 left-1/2 -translate-x-1/2" },
  izquierda: { Icono: ArrowLeft, lugar: "left-2 top-1/2 -translate-y-1/2" },
  derecha: { Icono: ArrowRight, lugar: "right-2 top-1/2 -translate-y-1/2" },
};

export default function CapturaGuiada({
  captura,
  forma = "cuadrada",
  ovalo = "inset-x-[17%] inset-y-[12%]",
  etiqueta = "Vista de tu cámara",
  onCancelar,
  className = "",
}) {
  const { videoRef, fase, paso, guia, nivel: nivelGuia, aviso, reintentarGuiado, saltarPose, cancelar } = captura;
  const guiando = fase === "guiado" && paso;
  const guardando = fase === "guardando";
  const nivel = guiando ? paso.nivel : guardando ? "ok" : nivelGuia;
  const tono = TONO_GUIA[nivel] ?? TONO_GUIA.info;
  const texto = guiando ? paso.texto : guardando ? guia : fase === "preparando" || fase === "inicio" ? "Preparando la cámara…" : guia;
  const flecha = guiando && !paso.error ? FLECHA[paso.flecha] : null;
  const hechas = paso?.hechas ?? [];
  const saltadas = paso?.saltadas ?? [];

  return (
    <div className={`grid gap-3 ${className}`} data-captura-guiada data-fase={fase}>
      <div
        className={`relative mx-auto w-full overflow-hidden bg-slate-900 ${
          forma === "vertical" ? "aspect-[3/4] max-w-sm rounded-3xl" : "aspect-square max-w-[320px] rounded-2xl"
        }`}
      >
        <video ref={videoRef} muted playsInline autoPlay aria-label={etiqueta} className="size-full -scale-x-100 object-cover" />
        <span
          className={`pointer-events-none absolute rounded-[50%] border-[3px] shadow-[0_0_0_999px_rgba(15,23,42,0.35)] transition-colors ${ovalo} ${tono.ovalo}`}
          aria-hidden="true"
          data-ovalo={nivel}
        />
        {guiando || guardando ? (
          <span
            className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-bold tabular-nums text-white"
            data-avance
          >
            {guardando ? "5 de 5" : `${paso.actual} de ${paso.total}`}
          </span>
        ) : null}
        {flecha ? (
          <span
            className={`pointer-events-none absolute grid size-12 place-items-center rounded-full bg-blue-600 text-white shadow-lg motion-safe:animate-pulse ${flecha.lugar}`}
            aria-hidden="true"
            data-flecha={paso.flecha}
          >
            <flecha.Icono className="size-7" strokeWidth={2.75} />
          </span>
        ) : null}
      </div>

      {guiando || guardando ? (
        <ol className="grid grid-cols-5 gap-1" aria-label="Fotos del registro">
          {POSES_GUIADAS.map((p, i) => {
            const hecha = guardando || hechas.includes(p.pose);
            const saltada = saltadas.includes(p.pose);
            const actual = guiando && paso.indice === i;
            return (
              <li
                key={p.pose}
                data-pose={p.pose}
                data-estado={hecha ? "hecha" : saltada ? "saltada" : actual ? "actual" : "pendiente"}
                className="flex min-w-0 flex-col items-center gap-1 text-center"
              >
                <span
                  className={`grid h-2 w-full place-items-center rounded-full ${
                    hecha ? "bg-green-500" : saltada ? "bg-slate-200" : actual ? "bg-blue-600" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`flex items-center gap-0.5 truncate text-[11px] font-medium ${
                    hecha ? "text-green-700" : actual ? "text-blue-700" : "text-slate-500"
                  }`}
                >
                  {hecha ? <Check className="size-3 shrink-0" aria-hidden="true" /> : null}
                  {p.corto}
                  <span className="sr-only">{hecha ? ": lista" : saltada ? ": omitida" : actual ? ": en curso" : ": pendiente"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <p
        role="status"
        aria-live="polite"
        className={`min-h-12 rounded-xl border px-3 py-2.5 text-center text-[15px] font-semibold ${tono.caja}`}
        data-guia={nivel}
      >
        {texto}
      </p>
      {aviso ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {aviso.texto}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancelar ?? cancelar}
          disabled={guardando}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={reintentarGuiado}
          disabled={!guiando}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reintentar
        </button>
      </div>
      {guiando && paso.puedeSaltar ? (
        <button
          type="button"
          onClick={saltarPose}
          className="min-h-11 rounded-xl text-sm font-semibold text-slate-600 underline-offset-2 hover:underline"
        >
          ¿No sale esta foto? Saltar este paso
        </button>
      ) : null}
      {guiando && !paso.error ? (
        <p className="text-center text-xs text-slate-500">La foto se toma sola cuando estás en la posición. Sin lentes oscuros ni gorra.</p>
      ) : null}
    </div>
  );
}
