import EvaluationModule from "@/components/evaluaciones/EvaluationModule";
export default async function Page({ params }) {
  const { secciones = [] } = await params;
  return <EvaluationModule segments={secciones} />;
}
