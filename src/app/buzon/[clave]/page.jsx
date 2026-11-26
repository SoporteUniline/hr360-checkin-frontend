import BuzonPublico from "@/components/clima/BuzonPublico";

export const metadata = { title: "Buzón confidencial | ADAMIA", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page({ params }) {
  const { clave } = await params;
  return <BuzonPublico clave={clave} />;
}
