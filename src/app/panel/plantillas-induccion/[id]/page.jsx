import EditorPlantilla from "@/components/induccion/EditorPlantilla";

// Editor de una plantilla de inducción («nueva» = en blanco).
export const metadata = { title: "Plantilla de inducción | ADAMIA" };

export default async function PaginaEditorPlantilla({ params }) {
  const { id } = await params;
  return <EditorPlantilla id={id} />;
}
