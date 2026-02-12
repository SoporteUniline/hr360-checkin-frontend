"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Plus, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EstadoCivilTable from "./EstadoCivilTable";
import EstadoCivilFormDialog from "./EstadoCivilFormDialog";
import EstadoCivilDeleteDialog from "./EstadoCivilDeleteDialog";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";

export default function EstadoCivil() {
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [estadoCivil, setEstadoCivil] = useState([]);
  const [editCiv, setEditCiv] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openFormModal, setOpenFormModal] = useState(false);

  const { dataUser } = useAuth();

  const [empresaActiva, setEmpresaActiva] = useState(null);

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

  const id_empresa = empresaActiva;
  const key = id_empresa
    ? `/checador/estados-civiles?id_empresa=${id_empresa}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header - Diseño ADAMIA */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Estado civil</h1>
            <p className="text-sm text-gray-600">
              Gestiona el catálogo de estados civiles.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[260px_1fr_auto] items-end">
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
            <Label>Estado civil</Label>
            <Input
              className="bg-white"
              placeholder="Buscar estado civil..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <Button
            onClick={() => {
              setEditCiv(null);
              setOpenFormModal(true);
            }}
            className="w-full md:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-1" /> Nuevo estado civil
          </Button>
        </div>
      </div>

      <EstadoCivilTable
        id_empresa={id_empresa}
        filter={debouncedFilter}
        swrKey={key}
        onEdit={(civ, lista) => {
          setEditCiv(civ);
          setEstadoCivil(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setEstadoCivil((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <EstadoCivilFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editCiv={editCiv}
        id_empresa={id_empresa}
        estadoCivil={estadoCivil}
        mutateKey={key}
        empresas={dataUser?.empresas_detalle || []}
      />

      <EstadoCivilDeleteDialog
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
