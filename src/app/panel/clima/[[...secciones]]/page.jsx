import ModuloClima from "@/components/clima/ModuloClima";

export const metadata = { title: "Clima y NOM-035 | ADAMIA" };

export default async function Page({ params }) {
  const { secciones = [] } = await params;
  return <ModuloClima segmentos={secciones} />;
}
