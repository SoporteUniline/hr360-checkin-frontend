import { ProductDetail } from "@/components/activos/Inventory";
export default async function Page({ params }) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}
