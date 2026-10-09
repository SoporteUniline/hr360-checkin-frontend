import { ProductForm } from "@/components/activos/Inventory";
export default async function Page({ params }) {
  const { id } = await params;
  return <ProductForm key={id} id={id} type="asset" />;
}
