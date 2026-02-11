"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TiposRegistroTable from "./TiposRegistroTable";
import TipoRegistroFormDialog from "./TipoRegistroFormDialog";
import TipoRegistroDeleteDialog from "./TipoRegistroDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";

export default function TiposRegistro() {
  const { dataUser } = useAuth();
  const [filter, setFilter] = useState("");
  const [empresaActiva, setEmpresaActiva] = useState("all");
  const debouncedFilter = useDebounce(filter, 500);
  const [registros, setRegistros] = useState([]);
  const [editPerm, setEditPerm] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const [page, setPage] = useState(1);

  const handleEmpresaChange = (val) => {
    setEmpresaActiva(val === "all" ? "all" : Number(val));
    setPage(1);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };

  const key = `/checador/tiposPermiso?id_empresa=${empresaActiva}&clave=${debouncedFilter}`;

  return (
    <div className="space-y-4">
      {/* Encabezado (colores del sistema) */}
      <div>
        <h1 className="text-2xl font-bold text-[#2c3e50]">Tipos de registro</h1>
        <p className="text-sm text-[#6b7280]">
          Catálogo para asistencias/permisos (crear, editar y eliminar)
        </p>
      </div>

      {/* 4. Grid de filtros con Selector de Empresa y Buscador */}
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr_auto] gap-4 items-end mb-2">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Filtrar por Empresa</Label>
          <Combobox
            options={[
              { value: "all", label: "Todas las empresas" },
              ...(dataUser?.empresas_detalle?.map((e) => ({
                value: e.id_empresa,
                label: e.nombre,
              })) || []),
            ]}
            value={empresaActiva}
            onChange={handleEmpresaChange}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Buscar</Label>
          <Input
            placeholder="Buscar por clave o nombre..."
            value={filter}
            onChange={handleFilterChange}
          />
        </div>

        <Button
          className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
          onClick={() => {
            setEditPerm(null);
            setOpenForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
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
