/**
 * Historial de un registro, del más reciente al más viejo. eventos: [{ id, titulo, detalle, destacado }]. Los
 * destacados (firmas, convenios, alta) llevan el punto azul; los demás, gris.
 */
export default function LineaDeTiempo({ eventos = [], vacio = "Todavía no hay movimientos." }) {
  if (!eventos.length) return <p className="m-0 text-[#4B5563]">{vacio}</p>;
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {eventos.map((e, i) => (
        <li key={e.id ?? i} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-[9px] h-2.5 w-2.5 flex-none rounded-full" style={{ background: e.destacado ? "#2C56E8" : "#CBD3E3" }} />
          <span className="min-w-0 break-words">
            <b className="font-bold">{e.titulo}</b>
            {e.detalle ? <><br /><span className="text-[17px] text-[#374151] lg:text-[16px]">{e.detalle}</span></> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
