import EncuestaPublica from "@/components/clima/EncuestaPublica";

export const metadata = { title: "Encuesta | ADAMIA", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page({ params }) {
  const { token } = await params;
  return <EncuestaPublica token={token} />;
}
