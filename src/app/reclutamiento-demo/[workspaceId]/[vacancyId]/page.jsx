import PublicVacancy from "@/components/reclutamiento/PublicVacancy";

export const metadata = {
  title: "Vista de prueba de vacante | ADAMIA",
  robots: { index: false, follow: false },
};

export default async function PublicVacancyPage({ params }) {
  const { workspaceId, vacancyId } = await params;
  return <PublicVacancy workspaceId={workspaceId} vacancyId={vacancyId} />;
}
