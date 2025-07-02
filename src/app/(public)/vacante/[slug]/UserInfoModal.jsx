import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BriefcaseBusiness, School, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const UserInfoModal = ({ user, open, onOpenChange }) => {
  const [tab, setTab] = useState("personales");

  const datos = user?.datos_personales || {};
  const estudios = user?.estudios_academicos || [];
  const experiencia = user?.experiencia_laboral || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Información del Usuario</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <div className="flex justify-between items-center">
          <section>
            <h2 className="font-bold text-2xl">{user?.nombre}</h2>
            <p className="text-gray-400">{user?.correo}</p>
          </section>
          {user?.url_imagen ? (
            <img
              src={user?.url_imagen}
              alt="Foto del usuario"
              className="w-18 h-18 rounded-full object-cover"
            />
          ) : null}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 ">
            <TabsTrigger value="personales">
              <User className="mr-2 h-4 w-4" />
              Datos Personales
            </TabsTrigger>
            <TabsTrigger value="estudios">
              <School className="mr-2 h-4 w-4" />
              Estudios
            </TabsTrigger>
            <TabsTrigger value="experiencia">
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
              Experiencia
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full flex flex-col justify-start min-h-[350px] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              className="absolute w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {tab === "personales" && (
                <section>
                  <p>
                    <strong>Teléfono:</strong> {datos.telefono}
                  </p>
                  <p>
                    <strong>Fecha de nacimiento:</strong>{" "}
                    {datos.fecha_nacimiento
                      ? new Date(datos.fecha_nacimiento).toLocaleDateString()
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Sexo:</strong> {datos.sexo}
                  </p>
                  <p>
                    <strong>Estado civil:</strong> {datos.estado_civil}
                  </p>
                  <p>
                    <strong>CURP:</strong> {datos.curp}
                  </p>
                </section>
              )}

              {tab === "estudios" && (
                <section>
                  {estudios.length === 0 && <p>No hay estudios registrados.</p>}
                  {estudios.map((e) => (
                    <div
                      key={e.id}
                      className="mb-4 pl-3 border-l-2 border-gray-300"
                    >
                      <p>
                        <strong>Nivel:</strong> {e.nivel_educativo}
                      </p>
                      <p>
                        <strong>Institución:</strong> {e.institucion}
                      </p>
                      <p>
                        <strong>Carrera:</strong> {e.carrera}
                      </p>
                      <p>
                        <strong>Año de finalización:</strong>{" "}
                        {e.anio_finalizacion}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {tab === "experiencia" && (
                <section>
                  {experiencia.length === 0 && (
                    <p>No hay experiencia registrada.</p>
                  )}
                  {experiencia.map((exp) => (
                    <div
                      key={exp.id}
                      className="mb-4 pl-3 border-l-2 border-gray-300"
                    >
                      <p>
                        <strong>Puesto:</strong> {exp.puesto}
                      </p>
                      <p>
                        <strong>Empresa:</strong> {exp.empresa}
                      </p>
                      <p>
                        <strong>Duración:</strong> {exp.duracion}
                      </p>
                      <p>
                        <strong>Actividades:</strong> {exp.actividades}
                      </p>
                      <p>
                        <strong>Motivo de salida:</strong>{" "}
                        {exp.motivo_salida || "N/A"}
                      </p>
                      <p>
                        <strong>Desde:</strong>{" "}
                        {new Date(exp.fecha_inicio).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Hasta:</strong>{" "}
                        {new Date(exp.fecha_fin).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserInfoModal;
