"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SucursalesTable from "./SucursalesTable";
import SucursalFormDialog from "./SucursalFormDialog";
import SucursalDeleteDialog from "./SucursalDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";
import useDebounce from "@/hooks/useDebounce";

export default function Sucursales() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("nombre") || "");
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
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          
        
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          onClick={() => {
            setEditSuc(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva unidad de negocio
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 grid grid-cols-1 md:grid-cols-[250px_1fr_auto] gap-4 items-end">
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
            placeholder="Buscar por nombre de unidad de negocio..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
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

      <AccesosRapidos />
    </div>
  );
}
