import { notFound } from "next/navigation";
import RecruitmentModule from "@/components/reclutamiento/RecruitmentModule";

export default function RecruitmentLayout({ children }) {
  const recruitmentEnabled =
    process.env.NEXT_PUBLIC_RECRUITMENT_ENABLED === "true";

  if (!recruitmentEnabled) {
    notFound();
  }

  return <RecruitmentModule>{children}</RecruitmentModule>;
}
