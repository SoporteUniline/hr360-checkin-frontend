import CatalogoCard from "@/components/CatalogoCard";
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
    { Icon: UserRound, title: "Empleados" },
    { Icon: BookText, title: "Tipos de registro" },
    { Icon: Building, title: "Departamentos" },
    { Icon: Store, title: "Sucursales" },
    { Icon: Handshake, title: "Estado civil" },
    { Icon: Landmark, title: "Cuentas bancarias" },
  ];

  return (
    <div className="grid grid-cols-1 gap-x-16 gap-y-8 mx-10 my-5 sm:grid-cols-2 lg:grid-cols-3">
      {catalogos.map((item, index) => (
        <CatalogoCard key={index} Icon={item.Icon} title={item.title} />
      ))}
    </div>
  );
}
