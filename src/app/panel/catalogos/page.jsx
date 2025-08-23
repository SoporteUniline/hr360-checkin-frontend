import CatalogoCard from "@/components/CatalogoCard";
import Link from "next/link";
import {
  BookText,
  Building,
  Handshake,
  Landmark,
  Store,
  UserRound,
} from "lucide-react";

export default function Catalogos() {
  const catalogos = [
    { Icon: UserRound, title: "Empleados", path: "/panel/catalogos/empleados" },
    {
      Icon: BookText,
      title: "Tipos de registro",
      path: "/panel/catalogos/tipos-registro",
    },
    {
      Icon: Building,
      title: "Departamentos",
      path: "/panel/catalogos/departamentos",
    },
    { Icon: Store, title: "Sucursales", path: "/panel/catalogos/sucursales" },
    {
      Icon: Handshake,
      title: "Estado civil",
      path: "/panel/catalogos/estado-civil",
    },
    {
      Icon: Landmark,
      title: "Cuentas bancarias",
      path: "/panel/catalogos/cuentas-bancarias",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-x-16 gap-y-8 mx-10 my-5 sm:grid-cols-2 lg:grid-cols-3">
      {catalogos.map((item, index) => (
        <Link key={index} href={item.path}>
          <CatalogoCard Icon={item.Icon} title={item.title} />
        </Link>
      ))}
    </div>
  );
}
