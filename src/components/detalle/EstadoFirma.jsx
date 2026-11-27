import { tono } from "./tonos";

const TONO = { firmado: "exito", pendiente: "aviso", enviado: "info" };

/** Estado de cada firma de un documento. firmantes: [{ rol, estado: 'firmado'|'enviado'|'pendiente', detalle }] */
export default function EstadoFirma({ firmantes = [] }) {
  return (
    <ul aria-label="Firmas del documento" className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 text-[17px] sm:grid-cols-2 lg:text-[16px]">
      {firmantes.map((f) => {
        const c = tono(TONO[f.estado] ?? "aviso");
        return (
          <li key={f.rol} className="rounded-[14px] px-3 py-2.5" style={{ background: c.suave, color: c.texto }} data-firma={f.estado}>
            <b className="font-bold">{f.rol}</b>
            <br />
            <span>{f.detalle}</span>
          </li>
        );
      })}
    </ul>
  );
}
