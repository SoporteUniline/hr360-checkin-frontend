import { redirect } from "next/navigation";

// (22/11/2026) «Bonos y descuentos» ahora es una sección del módulo Nómina; la dirección vieja sigue funcionando.
export default function AjustesNomina() {
  redirect("/panel/nomina/bonos");
}
