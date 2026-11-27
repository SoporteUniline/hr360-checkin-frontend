"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import FormularioContrato from "../formulario/FormularioContrato";

export default function NuevoContrato() {
  const q = useSearchParams();
  const duplicar = q.get("duplicar") || null;
  const empleado = q.get("empleado");
  const empresa = q.get("empresa");
  const sueldo = q.get("sueldo");
  const periodicidad = q.get("periodicidad");
  const inicial = useMemo(
    () => (empleado ? { id_empleado: empleado, id_empresa: empresa || "", salario_base: sueldo || "", periodicidad_pago: periodicidad || "" } : null),
    [empleado, empresa, sueldo, periodicidad],
  );
  // La «key» rehace el formulario si cambian los parámetros sin salir de la página.
  return <FormularioContrato key={`${duplicar ?? ""}-${empleado ?? ""}`} modo="nuevo" duplicar={duplicar} inicial={inicial} />;
}
