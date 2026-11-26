import { notFound } from "next/navigation";
import { headers } from "next/headers";
import VisitaDemo from "./VisitaDemo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo de Adamia" };

export default async function PruebaDemo() {
  const host = (await headers()).get("host");
  const backend = process.env.NEXT_PUBLIC_RUTA_BACKEND;
  if (host === "dev.adamia.com.mx") return <VisitaDemo url="/api/demo" />;
  if (process.env.ADAMIA_DEMO_COMPARTIDA !== "true" || !backend) notFound();

  return <VisitaDemo url={`${backend.replace(/\/$/, "")}/demo`} />;
}
