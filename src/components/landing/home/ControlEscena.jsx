"use client";

// Botón real para pausar, reanudar o repetir una escena animada (WCAG 2.2.2: lo que se mueve más de 5 s se puede
// detener). El hueco se reserva siempre para que el botón no empuje nada al aparecer; con «reducir movimiento» no hay
// botón porque la escena ya está quieta en su estado final.
export default function ControlEscena({ escena, controla, de }) {
  const { control, alControl } = escena;
  const icono = control === "Ver de nuevo"
    ? <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
    : control === "Reanudar animación" ? <path d="M8 5v14l11-7z" /> : <path d="M9 5v14M15 5v14" />;
  return (
    <div className="nv-control-caja">
      {control ? (
        <button type="button" className="nv-control" aria-controls={controla} onClick={alControl} data-control={control}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icono}</svg>
          {control}<span className="sr-only"> {de}</span>
        </button>
      ) : null}
    </div>
  );
}
