"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PositionFormDialog from "./PositionFormDialog";
import PositionDeleteDialog from "./PositionDeleteDialog";
import PositionsTable from "./PositionsTable";
import AccesosRapidos from "@/components/AccesosRapidos";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";

export default function Positions() {
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [positions, setPositions] = useState([]);
  const [editPosition, setEditPosition] = useState(null);
  const [deletePosition, setDeletePosition] = useState(null);
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

  const key = id_empresa ? `/checador/puestos?id_empresa=${id_empresa}` : null;

  return (
    <div>
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

        {/* Buscador */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="puesto-search">Puesto</Label>
          <Input
            id="puesto-search"
            placeholder="Buscar puesto..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Botón */}
        <div className="flex sm:col-span-2 lg:col-span-1">
          <Button
            className="w-full lg:w-auto"
            onClick={() => {
              setEditPosition(null);
              setOpenFormModal(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </div>
      </div>

      <PositionsTable
        id_empresa={id_empresa}
        filter={debouncedFilter}
        swrKey={key}
        onEdit={(position, lista) => {
          setEditPosition(position);
          setPositions(lista);
          setOpenFormModal(true);
        }}
        onDelete={(id) => {
          setDeletePosition(id);
          setOpenDeleteModal(true);
        }}
        onLoad={(lista) => {
          setPositions((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(lista);
            return prevStr === newStr ? prev : lista;
          });
        }}
      />

      <PositionFormDialog
        open={openFormModal}
        setOpen={setOpenFormModal}
        editPosition={editPosition}
        id_empresa={id_empresa}
        positions={positions}
        mutateKey={key}
        empresas={dataUser?.empresas_detalle || []}
      />

      <PositionDeleteDialog
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        deletePosition={deletePosition}
        mutateKey={key}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
