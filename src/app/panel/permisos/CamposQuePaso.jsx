"use client";

// Permisos (RH y empleado): el mismo par «Qué pasó» + «Motivo» que Asistencias (components/asistencia/QuePasoMotivo).
// Qué pasó: Inasistencia, Entrada tarde, Salida temprano, Salir en medio turno (y los que el catálogo marque como permiso).
// El motivo es obligatorio (sin motivo no hay permiso) salvo en los días de ley. El goce viene del motivo: RH lo cambia
// solo si el motivo «se cambia al aplicar» (si no, 🔒); el empleado no elige goce (rh = false). En los parciales el día
// es con goce y las horas se tratan como diga el motivo (se eligen en «Horas no trabajadas» de CamposPermisoHoras).
// Reglas en lib/asistencia/quePasoMotivo.mjs.
import QuePasoMotivo, { GoceMotivo } from "@/components/asistencia/QuePasoMotivo";
import { aplicado, opcionesMotivo, opcionesTipo, tiposPermisoCaptura } from "@/lib/asistencia/quePasoMotivo.mjs";

export default function CamposQuePaso({ tipos, idTipo, onTipo, motivos, par, onPar, rh = true, disabled = false, movil = false, errorMotivo = false, conVacaciones = false }) {
  const lista = tiposPermisoCaptura(tipos, { actual: idTipo || null, conVacaciones });
  const tipo = lista.find((t) => String(t.id) === String(idTipo)) ?? null;
  const { r, motivo, goce } = aplicado(par, tipo, motivos);
  return (
    <div className="flex flex-col gap-3" data-que-paso-permiso>
      <QuePasoMotivo etiquetas movil={movil} disabled={disabled} tipoOpciones={opcionesTipo(lista, { conAsistencia: false })}
        tipoVacio={idTipo ? null : "Elige qué pasó…"} tipo={String(idTipo ?? "")} onTipo={onTipo}
        motivoVisible={Boolean(tipo) && r.motivoVisible} motivoOpciones={opcionesMotivo(motivos)} motivoVacio="Elige el motivo…"
        motivo={par.motivo} onMotivo={(m) => onPar({ ...par, motivo: m, texto: "", goce: null, horas: null })}
        esOtro={Boolean(motivo?.otro)} texto={par.texto} onTexto={(t) => onPar({ ...par, texto: t })} errorMotivo={errorMotivo && !motivo} />
      {rh && tipo && goce && r.clase !== "parcial" ? (
        <div className="flex flex-col gap-1" data-goce-permiso>
          <span className="text-[12px] font-medium text-slate-500">Goce del día</span>
          <GoceMotivo goce={goce} cambia={r.goceCambia} disabled={disabled} movil={movil} onCambio={(g) => onPar({ ...par, goce: g })}
            className={r.goceCambia ? "w-full sm:w-1/2 sm:pr-1.5" : "h-9"} />
          <span className="text-[12px] text-slate-500">{r.clase === "ley" ? "Lo fija la ley." : r.goceCambia ? "Viene del motivo; puedes cambiarlo en este caso." : "Lo fija el motivo."}</span>
        </div>
      ) : null}
      {tipo && r.clase === "parcial" && motivo ? (
        <p className="text-[12px] text-slate-500">Día con goce; las horas no trabajadas se tratan como diga el motivo{rh ? "" : " (RH lo confirma)"}.</p>
      ) : null}
    </div>
  );
}
