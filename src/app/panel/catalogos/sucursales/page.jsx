"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SucursalesTable from "./SucursalesTable";
import SucursalFormDialog from "./SucursalFormDialog";
import SucursalDeleteDialog from "./SucursalDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";
import useDebounce from "@/hooks/useDebounce";

export default function Sucursales() {
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebounce(filter, 500);
  const [sucursales, setSucursales] = useState([]);
  const [editSuc, setEditSuc] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const [empresaActiva, setEmpresaActiva] = useState("all");
  const { dataUser } = useAuth();
  const key = `/checador/sucursales?id_empresa=${empresaActiva}&nombre=${debouncedFilter}`;

  return (
    <div className="space-y-4">
      {/* Encabezado (colores del sistema) - Relación: guía `Colores.txt` */}
      <div>
        <h1 className="text-2xl font-bold text-[#2c3e50]">Sucursales</h1>
        <p className="text-sm text-[#6b7280]">
          Catálogo de sucursales para la empresa (crear, editar y eliminar)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr_auto] gap-4 items-end mb-4">
        <div className="flex flex-col gap-1">
          <Label>Empresa</Label>
          <Combobox
            options={[
              { value: "all", label: "Todas las empresas" },
              ...(dataUser?.empresas_detalle?.map((e) => ({
                value: e.id_empresa,
                label: e.nombre,
              })) || []),
            ]}
            value={empresaActiva}
            onChange={(val) =>
              setEmpresaActiva(val === "all" ? "all" : Number(val))
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Buscar</Label>
          <Input
            placeholder="Buscar por nombre de sucursal..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
          onClick={() => {
            setEditSuc(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      <SucursalesTable
        id_empresa={empresaActiva}
        filter={debouncedFilter}
        swrKey={key}
        onEdit={(suc, lista) => {
          setEditSuc(suc);
          setSucursales(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setSucursales((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <SucursalFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editSuc={editSuc}
        empresas={dataUser?.empresas_detalle}
        id_empresa_defecto={empresaActiva}
        sucursales={sucursales}
        mutateKey={key}
      />

      <SucursalDeleteDialog
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        deleteId={deleteId}
        mutateKey={key}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
