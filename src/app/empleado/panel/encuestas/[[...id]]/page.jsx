import MisEncuestas from "@/components/clima/MisEncuestas";
import { vistaDeRuta } from "@/lib/clima/canales.mjs";

export const metadata = { title: "Encuestas | ADAMIA" };

export default async function Page({ params }) {
  const { id = [] } = await params;
  // …/encuestas/<id> contesta; …/encuestas/equipo/<id> es la vista del jefe.
  const v = vistaDeRuta(id);
  return <MisEncuestas id={v.vista === "encuesta" ? v.id : null} equipo={v.vista === "equipo" ? v.id : null} />;
}
