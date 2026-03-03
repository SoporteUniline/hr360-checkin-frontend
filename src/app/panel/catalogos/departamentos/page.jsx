"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DepartamentosTable from "./DepartamentosTable";
import DepartamentoFormDialog from "./DepartamentoFormDialog";
import DepartamentoDeleteDialog from "./DepartamentoDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";

export default function Departamentos() {
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [departamentos, setDepartamentos] = useState([]);
  const [editDep, setEditDep] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();

  const [empresaActiva, setEmpresaActiva] = useState(null);
  const id_empresa = empresaActiva;

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !empresaActiva) {
      setEmpresaActiva("all");
    }
  }, [dataUser, empresaActiva]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 400);
    return () => clearTimeout(timer);
  }, [filter]);

  const key = id_empresa
    ? `/checador/departamentos?id_empresa=${id_empresa}`
    : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Filtro de búsqueda - Estilo ADAMIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[260px_1fr_auto] items-end">
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
            placeholder="Seleccionar empresa"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="departamento-search">Departamento</Label>
          <Input
            id="departamento-search"
            placeholder="Buscar departamento..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          onClick={() => {
            setEditDep(null);
            setOpenFormModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo departamento
        </Button>
      </div>

      <DepartamentosTable
        id_empresa={id_empresa}
        filter={debouncedFilter}
        swrKey={key}
        onEdit={(dep, lista) => {
          setEditDep(dep);
          setDepartamentos(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setDepartamentos((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <DepartamentoFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editDep={editDep}
        id_empresa={id_empresa}
        departamentos={departamentos}
        mutateKey={key}
        empresas={dataUser?.empresas_detalle || []}
      />

      <DepartamentoDeleteDialog
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
