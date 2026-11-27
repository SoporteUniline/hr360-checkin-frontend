"use client";
import { Package, ClipboardCheck, ClipboardList, LogOut, UsersRound, ReceiptText, HandCoins, KeyRound, ScanFace, Activity, ShieldCheck, Route, CircleHelp } from "lucide-react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { API as API_INDUCCION, RUTA_BIENVENIDA } from "@/lib/induccion/induccion.mjs";
import { useAuth } from "@/context/AuthContext";
import { MenuLink, cardClass } from "@/components/empleado/shared";
import { useModulosActivos } from "@/components/modulos/useModulos";
import { rutaPermitida } from "@/lib/modulos/menu.mjs";
import useMonitorEquipo, { RUTA_MONITOR_EQUIPO } from "@/hooks/useMonitorEquipo";
import { ContadorEncuestas, useMisEncuestas } from "@/components/clima/AvisoEncuestas";
import { RUTA_EMPLEADO } from "@/lib/clima/pendientes.mjs";
export default function EmployeeSpace() {
  const { dataUser, logout } = useAuth();
  // Solo lo que su empresa tiene activo (recibos y préstamos = Nómina, activos, evaluaciones, solicitudes).
  const { activos, opciones } = useModulosActivos();
  const ver = (href) => rutaPermitida(href, activos, opciones);
  const { esJefe } = useMonitorEquipo();
  const { pendientes } = useMisEncuestas();
  // (27/12/2026) Inducción digital: su ruta de bienvenida, solo si tiene una (la de su ingreso).
  const conRuta = ver(RUTA_BIENVENIDA);
  const { data: bienvenida } = useSWR(conRuta ? `${API_INDUCCION}/mi-ruta` : null, (u) => axios.get(u).then((r) => r.data), { revalidateOnFocus: false, shouldRetryOnError: false });
  const ruta = bienvenida?.ruta;
  return <div className="space-y-5"><h1 className="text-3xl font-bold tracking-tight">Mi espacio</h1><section className={cardClass}><p className="font-semibold">{dataUser?.nombre}</p><p className="mt-1 break-words text-sm text-slate-500">{dataUser?.correo || dataUser?.email}</p></section>
    <div className="space-y-3">{ruta ? <MenuLink href={RUTA_BIENVENIDA} icon={Route} title="Mi ruta de bienvenida" description={`${ruta.listos} de ${ruta.total} listos`} /> : null}<MenuLink href="/empleado/panel/mi-firma" icon={KeyRound} title="Mi firma y PIN" description="Guarda tu firma y tu PIN para firmar documentos" />
      <MenuLink href="/empleado/panel/mi-rostro" icon={ScanFace} title="Mi rostro" description="Regístralo o actualízalo para checar" />
      <MenuLink href="/empleado/panel/seguridad" icon={ShieldCheck} title="Seguridad y Face ID" description="Entra sin contraseña y revisa tus dispositivos" />
      {ver("/empleado/panel/mis-recibos") ? <MenuLink href="/empleado/panel/mis-recibos" icon={ReceiptText} title="Mis recibos de pago" description="Consulta, descarga y firma tus recibos" /> : null}
      {ver("/empleado/panel/mis-prestamos") ? <MenuLink href="/empleado/panel/mis-prestamos" icon={HandCoins} title="Mis préstamos" description="Pide un préstamo, firma tu acuerdo y ve tu saldo" /> : null}
      {ver("/empleado/panel/mis-recursos") ? <MenuLink href="/empleado/panel/mis-recursos" icon={Package} title="Mis activos y uniformes" description="Consulta tus entregas y resguardos" /> : null}
      {/* Clima y NOM-035 no dependen de un módulo (la NOM-035 es obligatoria): «Encuestas» siempre está. */}
      <MenuLink href={RUTA_EMPLEADO} icon={ClipboardList} title="Encuestas" description={pendientes ? "Tienes encuestas por contestar" : "Clima y NOM-035, siempre anónimas"} contador={<ContadorEncuestas n={pendientes} />} />
      {ver("/empleado/panel/evaluaciones") ? <MenuLink href="/empleado/panel/evaluaciones" icon={ClipboardCheck} title="Mis evaluaciones" description="Evaluaciones, resultados y seguimiento" /> : null}
      {ver("/empleado/panel/solicitudes-equipo") ? <MenuLink href="/empleado/panel/solicitudes-equipo" icon={UsersRound} title="Solicitudes de mi equipo" description="Si tienes colaboradores asignados" /> : null}
      {esJefe
        ? <MenuLink href={RUTA_MONITOR_EQUIPO} icon={Activity} title="Monitor de mi equipo" description="Quién está trabajando y quién falta hoy" />
        : null}
      {/* (27/11/2026) Centro de ayuda: guías para empleados (y jefes) de los módulos que su empresa tiene. */}
      <MenuLink href="/empleado/panel/ayuda" icon={CircleHelp} title="Ayuda" description="Guías paso a paso para usar tu app" />
    </div><button onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border bg-white font-medium text-red-700"><LogOut className="size-4" />Cerrar sesión</button>
  </div>;
}
