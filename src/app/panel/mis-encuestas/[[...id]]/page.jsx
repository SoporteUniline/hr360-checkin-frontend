import MisEncuestas from "@/components/clima/MisEncuestas";
import { RUTA_PANEL } from "@/lib/clima/pendientes.mjs";

export const metadata = { title: "Mis encuestas | ADAMIA" };

// RH o dueño que también son empleados de su empresa: contestan aquí con el diseño del panel. ?empresa= dice de qué
// empresa es la encuesta (el servidor la valida contra la sesión y contesta como la ficha de esa sesión).
export default async function Page({ params, searchParams }) {
  const { id = [] } = await params;
  const empresa = Number((await searchParams)?.empresa);
  return (
    <MisEncuestas
      id={id[0] ? Number(id[0]) : null}
      empresa={Number.isInteger(empresa) && empresa > 0 ? empresa : null}
      base={RUTA_PANEL}
    />
  );
}
