import { VacancyRecord } from "@/components/reclutamiento/RecruitmentPages";
export default async function Page({ params }) {
  const { id } = await params;
  return <VacancyRecord vacancyId={id} />;
}
