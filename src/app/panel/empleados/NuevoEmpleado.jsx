"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FormularioEmpleado from "./FormularioEmpleado";

export default function NuevoEmpleado({
  editar = false,
  values = null,
  page,
  limit,
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={editar ? "ghost" : "default"}>
          {editar ? "Editar" : "Nuevo Empleado"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {editar ? "Editar Empleado" : "Registrar Nuevo Empleado"}
          </DialogTitle>
        </DialogHeader>
        <FormularioEmpleado
          editar={editar}
          values={values}
          page={page}
          limit={limit}
        />
      </DialogContent>
    </Dialog>
  );
}
