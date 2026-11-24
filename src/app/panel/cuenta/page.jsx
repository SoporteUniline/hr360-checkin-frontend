"use client";
// Mi cuenta del panel. Las pestañas visitadas siguen montadas (ocultas) para no perder lo escrito al cambiar de
// pestaña; GuardiaCuenta pregunta antes de salir si algo quedó sin guardar.
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import BasicInfoForm from "./BasicInfoForm";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import PasswordChange from "./Contrasena";
import { Building, KeyRound, User, UserCog, LayoutGrid, ChevronRight, Check } from "lucide-react";
import Link from "next/link";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import EmpresaInfoForm from "./Empresa/EmpresaForm";
import ErrorPage from "@/components/ErrorPage";
import { etiquetaRol, nombreEmpresaActiva } from "@/lib/miCuenta.mjs";
import { GuardiaCuentaProvider } from "./GuardiaCuenta";
import { useConfirmarSalida } from "@/components/cambios/CambiosPendientes";

const PESTANAS = [
  { valor: "cuenta", texto: "Mi cuenta", icono: User },
  { valor: "contrasenia", texto: "Seguridad", icono: KeyRound },
  { valor: "empresa", texto: "Mi empresa", icono: Building },
];

// Mismo subrayado de marca que las pestañas de Nómina; anula el fondo, borde y sombra de la pestaña base.
const clasePestana =
  "flex-none h-auto min-h-11 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2 text-[13.5px] font-semibold text-slate-500 shadow-none hover:text-slate-800 focus-visible:ring-[3px] focus-visible:ring-brand/30 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none sm:px-4";

export default function MyAccountReclutador() {
  const { dataUser } = useAuth();
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [pestana, setPestana] = useState("cuenta");
  const [visitadas, setVisitadas] = useState(() => new Set(["cuenta"]));
  // Cambiar de empresa con cambios sin guardar pregunta antes, igual que salir de la pantalla.
  const confirmarSalida = useConfirmarSalida();

  // id de empresa activa para el tab "Mi empresa"
  const idEmpresaActiva = empresaSeleccionada ?? dataUser?.id_empresa;
  const tieneMultiplesEmpresas = (dataUser?.empresas_detalle?.length ?? 0) > 1;

  const { data, isLoading, error } = useSWR(
    dataUser?.id_usuario ? `/users/${dataUser.id_usuario}` : null,
    fetcherWithToken,
    swr_config,
  );

  const cambiarPestana = (valor) => {
    setPestana(valor);
    setVisitadas((prev) => (prev.has(valor) ? prev : new Set(prev).add(valor)));
  };

  if (isLoading) {
    return (
      <div role="status" className="flex flex-col justify-center items-center gap-3 h-100">
        <Icon icon="line-md:loading-loop" width="40" height="40" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) return <ErrorPage message={error?.message} />;

  const rol = etiquetaRol(data?.tipo_usuario ?? dataUser?.tipo_usuario);
  const empresa = nombreEmpresaActiva(dataUser);

  const accesoModulos = (
    // Módulos por empresa: se configuran en su propia pantalla.
    <Link href="/panel/modulos" className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 transition-colors hover:border-brand/40 hover:bg-blue-50/40">
      <LayoutGrid className="size-5 shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[#080d36]">Módulos de tu empresa</span>
        <span className="block text-[12.5px] text-slate-500">Prende o apaga lo que usan, o contrata más.</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  );

  return (
    <GuardiaCuentaProvider>
      <div className="mx-auto w-full max-w-[1280px] space-y-5 p-1">
        <EncabezadoPagina
          icono={UserCog}
          titulo="Mi cuenta"
          subtitulo="Administra tu información personal, seguridad y datos de tu empresa"
        />

        <Tabs value={pestana} onValueChange={cambiarPestana} className="w-full gap-5">
          <div className="-mt-1 overflow-x-auto border-b border-slate-200">
            <TabsList aria-label="Secciones de mi cuenta" className="h-auto w-max min-w-full justify-start gap-1 rounded-none bg-transparent p-0">
              {PESTANAS.map(({ valor, texto, icono: Icono }) => (
                <TabsTrigger key={valor} value={valor} className={clasePestana}>
                  <Icono className="size-4 shrink-0" aria-hidden="true" />
                  {texto}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="cuenta" forceMount className="mt-0 data-[state=inactive]:hidden">
            <BasicInfoForm user={data} rol={rol} empresa={empresa} />
          </TabsContent>
          <TabsContent value="contrasenia" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitadas.has("contrasenia") ? <PasswordChange user={data} /> : null}
          </TabsContent>
          <TabsContent value="empresa" forceMount className="mt-0 space-y-5 data-[state=inactive]:hidden">
            {visitadas.has("empresa") ? (
              <>
                {tieneMultiplesEmpresas && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p id="titulo-empresas" className="mb-3 text-[13.5px] font-semibold text-[#080d36]">
                      Selecciona la empresa a editar
                    </p>
                    <div role="group" aria-labelledby="titulo-empresas" className="flex flex-wrap gap-2">
                      {dataUser.empresas_detalle.map((emp) => {
                        const activa = idEmpresaActiva === emp.id_empresa;
                        return (
                          <button
                            key={emp.id_empresa}
                            type="button"
                            aria-pressed={activa}
                            onClick={() => { if (!activa) confirmarSalida(() => setEmpresaSeleccionada(emp.id_empresa)); }}
                            className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors sm:min-h-10 ${
                              activa
                                ? "border-brand bg-blue-50 text-brand"
                                : "border-slate-200 bg-white text-slate-700 hover:border-brand/50 hover:text-brand"
                            }`}
                          >
                            {emp.url_imagen ? (
                              <img src={emp.url_imagen} alt="" className="size-5 shrink-0 rounded object-cover" />
                            ) : null}
                            <span className="truncate">{emp.nombre}</span>
                            {activa ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <EmpresaInfoForm key={idEmpresaActiva} idEmpresa={idEmpresaActiva} lateral={accesoModulos} />
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </GuardiaCuentaProvider>
  );
}
