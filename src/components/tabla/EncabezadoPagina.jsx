"use client";

// Encabezado compacto estándar Adamia: tile degradado 40px + título +
// subtítulo + regla de marca. Mismo markup aprobado en Asistencias.
// `acciones` (opcional) se alinea a la derecha en la misma fila.

export default function EncabezadoPagina({
  icono: Icono,
  titulo,
  subtitulo,
  acciones,
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
          {Icono ? <Icono className="h-5 w-5 text-white" /> : null}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
            {titulo}
          </h1>
          {subtitulo ? (
            <p className="text-[12.5px] text-gray-500">{subtitulo}</p>
          ) : null}
        </div>
        {acciones ? (
          <div className="ml-auto flex items-center gap-2">{acciones}</div>
        ) : null}
      </div>
      <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
    </div>
  );
}
