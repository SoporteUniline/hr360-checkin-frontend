import { EmployeeDetail } from "@/components/activos/Employees";
export default async function Page({ params }) {
  const { id } = await params;
  return <EmployeeDetail key={id} id={id} />;
}
