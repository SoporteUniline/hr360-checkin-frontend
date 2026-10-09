import { ActivosProvider } from "@/components/activos/ActivosProvider";
export default function Layout({ children }) {
  return <ActivosProvider>{children}</ActivosProvider>;
}
