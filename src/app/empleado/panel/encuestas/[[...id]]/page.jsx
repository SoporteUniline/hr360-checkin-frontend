import MisEncuestas from "@/components/clima/MisEncuestas";

export const metadata = { title: "Encuestas | ADAMIA" };

export default async function Page({ params }) {
  const { id = [] } = await params;
  return <MisEncuestas id={id[0] ? Number(id[0]) : null} />;
}
