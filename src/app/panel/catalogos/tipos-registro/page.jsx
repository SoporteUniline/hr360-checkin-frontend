"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Filter, Plus } from "lucide-react";
import TiposRegistroTable from "./TiposRegistroTable";
import TipoRegistroFormDialog from "./TipoRegistroFormDialog";
import TipoRegistroDeleteDialog from "./TipoRegistroDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import { Combobox } from "@/components/Combobox";
import { CampoFiltro } from "@/components/filtros/CampoFiltro";

export default function TiposRegistro() {
  const { dataUser } = useAuth();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("filter") || "");
  const [unidadActiva, setUnidadActiva] = useState("all");
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();
  const empresaActiva =
    unidadActiva === "all"
      ? "all"
      : String(unidadById[unidadActiva]?.id_empresa || "all");
  const debouncedFilter = useDebounce(filter, 500);
  const [registros, setRegistros] = useState([]);
  const [editPerm, setEditPerm] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const [page, setPage] = useState(1);

  const handleEmpresaChange = (val) => {
    setUnidadActiva(val || "all");
    setPage(1);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };

  const key = `/checador/tiposPermiso?id_empresa=${empresaActiva}&clave=${debouncedFilter}`;

  return (
    <div className="space-y-6">
      {/* Encabezado compacto Adamia */}
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Tipos de registro
            </h1>
            <p className="text-[12.5px] text-gray-500">
              Catálogo para asistencias/permisos (crear, editar y eliminar).
            </p>
          </div>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
      </div>

      {/* Filtros homologados */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-[250px_1fr_auto]">
          <CampoFiltro etiqueta="Unidad de negocio">
            <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px] [&_button]:font-medium">
              <Combobox
                options={[
                  { value: "all", label: "Todas las unidades de negocio" },
                  ...unidadOptions,
                ]}
                value={unidadActiva}
                onChange={handleEmpresaChange}
              />
            </div>
          </CampoFiltro>
          <CampoFiltro>
            <Input
              className="h-[38px] rounded-md border-gray-200 bg-white text-[13px]"
              placeholder="Buscar tipo de registro..."
              value={filter}
              onChange={handleFilterChange}
            />
          </CampoFiltro>
          <div className="flex justify-start md:justify-end">
            <Button
              className="h-[38px] w-full gap-2 rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95 md:w-auto"
              onClick={() => {
                setEditPerm(null);
                setOpenForm(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>
        </div>
      </div>

      <TiposRegistroTable
        page={page}
        setPage={setPage}
        id_empresa={empresaActiva}
        filter={debouncedFilter}
        swrKey={key}
        onEdit={(perm, lista) => {
          setEditPerm(perm);
          setRegistros(lista);
          setOpenForm(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDelete(true);
        }}
        onLoad={(lista) => {
          setRegistros((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <TipoRegistroFormDialog
        open={openForm}
        setOpen={setOpenForm}
        editRegistro={editPerm}
        id_empresa_defecto={empresaActiva}
        empresas={dataUser?.empresas_detalle}
        registros={registros}
        mutateKey={key}
      />

      <TipoRegistroDeleteDialog
        open={openDelete}
        setOpen={setOpenDelete}
        deleteId={deleteId}
        mutateKey={key}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
