import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormLabelWithAsterisk } from "@/components/FormLabelWithAsterisk";
import { BonosEmpleado, MedioPago } from "./PagoNominaEmpleado";
import { useModulosActivos } from "@/components/modulos/useModulos";
import Link from "next/link";
import useSWR from "swr";
import { contratosApi } from "@/lib/contratosApi";

const POR_PERIODO = { Mensual: "al mes", Quincenal: "a la quincena", Catorcenal: "a la catorcena", Semanal: "a la semana", Diario: "al día", "Por hora": "por hora" };
const pesos = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// (27/11/2026, decisión del dueño) El sueldo vive en el contrato vigente: con contrato, la ficha lo muestra de solo
// lectura con liga al contrato (se cambia con un convenio). Sin contrato vigente, la nómina usa el de la ficha
// (marcado) y se ofrece crear el contrato con ese sueldo.
function SueldoDelContrato({ salario }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-[16px] text-[#1E3A8A] md:col-span-2" data-sueldo-contrato>
      <p className="m-0 font-semibold">Sueldo del contrato {salario.folio ?? "vigente"}</p>
      <p className="m-0 mt-1 text-[22px] font-bold text-gray-900">{pesos(salario.salario)} <span className="text-[16px] font-medium text-gray-700">{POR_PERIODO[salario.periodicidad] ?? ""}</span></p>
      <p className="m-0 mt-1">Es el sueldo que usan la nómina, los finiquitos y los aguinaldos. Para cambiarlo, haz un convenio en el contrato.</p>
      {salario.id_contrato ? (
        <Link href={`/panel/contratos/${salario.id_contrato}`} className="mt-2 inline-flex min-h-12 items-center font-semibold text-[#1E40C4] underline">Ver contrato</Link>
      ) : null}
    </div>
  );
}

function SinContratoVigente({ form, empleadoId }) {
  const q = new URLSearchParams({ empleado: String(empleadoId) });
  if (form.getValues("id_empresa")) q.set("empresa", String(form.getValues("id_empresa")));
  if (form.getValues("sueldo")) q.set("sueldo", String(form.getValues("sueldo")));
  if (form.getValues("periodo_pago")) q.set("periodicidad", String(form.getValues("periodo_pago")));
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[16px] text-amber-900 md:col-span-2" data-sin-contrato>
      <p className="m-0 font-semibold">Sin contrato vigente</p>
      <p className="m-0 mt-1">Mientras no tenga contrato, la nómina, los finiquitos y los aguinaldos usan el sueldo de esta ficha (marcado «sin contrato vigente»).</p>
      <Link href={`/panel/contratos/nuevo?${q}`} className="mt-2 inline-flex min-h-12 items-center font-semibold text-[#1E40C4] underline">Crear contrato con este sueldo</Link>
    </div>
  );
}

export default function TabNomina({ renderCampos = () => null, form, soloLectura, empleadoId = null }) {
  const { data: salario } = useSWR(empleadoId ? ["salario-vigente", empleadoId] : null, () => contratosApi.salario(empleadoId), { revalidateOnFocus: false, shouldRetryOnError: false });
  const conContrato = salario?.origen === "contrato";
  const periodoPago = form.watch("periodo_pago");
  // Bonos y descuentos son del módulo de Nómina: con Nómina apagado no se muestran (el sueldo sí, es de la ficha).
  const { activos } = useModulosActivos();
  const conNomina = !activos || activos.has("nomina");

  const sueldoLabel =
    {
      Diario: "Sueldo diario ($)",
      Semanal: "Sueldo semanal ($)",
      Catorcenal: "Sueldo catorcenal ($)",
      Quincenal: "Sueldo quincenal ($)",
      Mensual: "Sueldo mensual ($)",
      "Por hora": "Sueldo por hora ($)",
    }[periodoPago] || "Sueldo ($)";

  return (
    <section className="space-y-6">
      <div className="border border-slate-200 bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-brand p-3 rounded-lg shadow-md">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Datos de nómina</h3>
            <p className="text-sm text-gray-600">
              Configura la información salarial
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {renderCampos("inicio", true)}
          <FormField
            name="periodo_pago"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabelWithAsterisk required={true}>
                  Periodo de pago
                </FormLabelWithAsterisk>
                <Select
                  onValueChange={field.onChange}
                  value={field.value !== "" ? field.value : "sin-seleccion"}
                  disabled={soloLectura}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un periodo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sin-seleccion">
                      Selecciona un periodo
                    </SelectItem>
                    {[
                      "Diario",
                      "Semanal",
                      "Catorcenal",
                      "Quincenal",
                      "Mensual",
                      "Por hora",
                    ].map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {renderCampos("periodo_pago", true)}

          <FormField
            name="forma_pago"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabelWithAsterisk required={true}>
                  Forma de pago
                </FormLabelWithAsterisk>
                <Select
                  onValueChange={field.onChange}
                  value={field.value !== "" ? field.value : "sin-seleccion"}
                  disabled={soloLectura}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la forma de pago" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sin-seleccion">
                      Selecciona una forma de pago
                    </SelectItem>
                    {["Fijo", "Comisiones", "Fijo + Comisiones"].map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {renderCampos("forma_pago", true)}

          <FormField
            name="forma_calculo"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabelWithAsterisk required={true}>
                  Forma de cálculo
                </FormLabelWithAsterisk>
                <Select
                  onValueChange={field.onChange}
                  value={field.value !== "" ? field.value : "sin-seleccion"}
                  disabled={soloLectura}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la forma de cálculo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sin-seleccion">
                      Selecciona una forma de cálculo
                    </SelectItem>
                    {["$", "%", "Ambos"].map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {renderCampos("forma_calculo", true)}

          {conContrato ? <SueldoDelContrato salario={salario} /> : null}
          {!conContrato && empleadoId && salario ? <SinContratoVigente form={form} empleadoId={empleadoId} /> : null}
          {!conContrato && ["$", "Ambos"].includes(form.watch("forma_calculo")) && (
            <FormField
              name="sueldo"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{sueldoLabel}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={soloLectura}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseFloat(value) : null);
                        if (form.getValues("forma_calculo") === "$") {
                          form.setValue("porcentaje", null, { shouldDirty: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {renderCampos("sueldo", true)}

          {["%", "Ambos"].includes(form.watch("forma_calculo")) && (
            <FormField
              name="porcentaje"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porcentaje (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={soloLectura}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseFloat(value) : null);
                        if (form.getValues("forma_calculo") === "%") {
                          form.setValue("sueldo", null, { shouldDirty: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {renderCampos("porcentaje", true)}
          {renderCampos("fin", true)}
        </div>
      </div>
      {/* Nómina R1: cómo se le paga y qué bonos o descuentos tiene. */}
      <div className="rounded-xl border-2 border-gray-100 bg-white p-6">
        <h3 className="text-lg font-bold text-gray-900">Pago en la nómina</h3>
        <p className="mb-4 text-sm text-gray-600">Cómo recibe su pago y sus bonos o descuentos de cada periodo.</p>
        <MedioPago form={form} soloLectura={soloLectura} />
        <h4 className="mb-2 mt-6 font-semibold text-gray-900">Bonos y descuentos</h4>
        {conNomina ? <BonosEmpleado idEmpleado={form.watch("id_empleado")} soloLectura={soloLectura} /> : null}
      </div>
    </section>
  );
}
