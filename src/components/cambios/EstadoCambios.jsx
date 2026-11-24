// (23/11/2026) Estado junto al botón Guardar: punto + «Cambios sin guardar», o «Sin cambios» discreto.
// Lo usan la ficha del empleado (FormularioEmpleado) y Mi cuenta (panel/cuenta).
// campos (opcional): qué cambió; se ve al pasar el mouse y ayuda a diagnosticar avisos inesperados.
export default function EstadoCambios({ hayCambios, campos = [] }) {
  return hayCambios ? (
    <span data-estado-cambios="pendientes" data-campos-cambiados={campos.join(",")} title={campos.length ? `Cambió: ${campos.join(", ")}` : undefined} role="status" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-700 sm:text-sm">
      <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
      Cambios sin guardar
    </span>
  ) : (
    <span data-estado-cambios="sin-cambios" role="status" className="shrink-0 text-xs text-gray-400 sm:text-sm">Sin cambios</span>
  );
}
