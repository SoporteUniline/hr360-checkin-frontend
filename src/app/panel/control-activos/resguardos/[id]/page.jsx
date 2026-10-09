import Receipt from "@/components/activos/Receipt";
export default async function Page({ params }) {
  const { id } = await params;
  return <Receipt id={id} />;
}
