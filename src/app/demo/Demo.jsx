"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const empleadosIniciales = [
  { nombre: "Ana Torres", area: "Operaciones", checada: "08:55", vacaciones: "Pendiente" },
  { nombre: "Diego Luna", area: "Ventas", checada: "", vacaciones: "" },
  { nombre: "Sofía Ramos", area: "Administración", checada: "09:02", vacaciones: "" },
];

const modulos = ["Empleados", "Asistencias", "Vacaciones"];

export default function Demo() {
  const [empleados, setEmpleados] = useState(empleadosIniciales);
  const [modulo, setModulo] = useState(modulos[0]);
  const [mensaje, setMensaje] = useState("");
  const [version, setVersion] = useState(0);

  function agregarEmpleado(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const nombre = datos.get("nombre").trim();
    const area = datos.get("area").trim();
    if (!nombre || !area) {
      setMensaje("Escribe el nombre y el área.");
      return;
    }
    setEmpleados(actuales => [...actuales, { nombre, area, checada: "", vacaciones: "" }]);
    event.currentTarget.reset();
    setMensaje(`Se agregó a ${nombre}.`);
  }

  function actualizarEmpleado(indice, cambios, aviso) {
    setEmpleados(actuales => actuales.map((empleado, posicion) => (
      posicion === indice ? { ...empleado, ...cambios } : empleado
    )));
    setMensaje(aviso);
  }

  function restablecer() {
    setEmpleados(empleadosIniciales);
    setVersion(actual => actual + 1);
    setMensaje("Se restauraron los datos de ejemplo.");
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm underline">Volver a Adamia</Link>
          <h1 className="mt-3 text-3xl font-semibold">Demo de Adamia</h1>
          <p className="mt-2 text-muted-foreground">Prueba con datos ficticios. Los cambios se borran al recargar.</p>
        </div>
        <Button variant="outline" onClick={restablecer}>Restablecer demo</Button>
      </header>

      <nav aria-label="Módulos de la demo" className="flex flex-wrap gap-2">
        {modulos.map(nombre => (
          <Button key={nombre} variant={nombre === modulo ? "default" : "outline"}
            aria-pressed={nombre === modulo} onClick={() => { setModulo(nombre); setMensaje(""); }}>
            {nombre}
          </Button>
        ))}
      </nav>

      <section aria-label={modulo} className="space-y-4 rounded-xl border p-4 sm:p-6">
        {modulo === "Empleados" && (
          <form key={version} onSubmit={agregarEmpleado} className="flex flex-wrap items-end gap-3">
            <label className="grid grow gap-1 text-sm font-medium">
              Nombre
              <Input name="nombre" required maxLength={80} />
            </label>
            <label className="grid grow gap-1 text-sm font-medium">
              Área
              <Input name="area" required maxLength={80} />
            </label>
            <Button type="submit">Agregar empleado</Button>
          </form>
        )}

        <ul className="divide-y">
          {empleados.map(({ nombre, area, checada, vacaciones }, indice) => (
            <li key={indice} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{nombre}</p>
                <p className="text-sm text-muted-foreground">{area}</p>
              </div>
              {modulo === "Asistencias" && (checada ? <span>Entrada a las {checada}</span> : (
                <Button variant="outline" onClick={() => actualizarEmpleado(indice, {
                  checada: new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
                }, `Se registró la entrada de ${nombre}.`)}>Registrar entrada</Button>
              ))}
              {modulo === "Vacaciones" && (
                <div className="flex flex-wrap items-center gap-2">
                  <span>{vacaciones || "Sin solicitud"}</span>
                  {!vacaciones && (
                    <Button variant="outline" onClick={() => actualizarEmpleado(indice, { vacaciones: "Pendiente" },
                      `Se creó la solicitud de ${nombre}.`)}>Solicitar vacaciones</Button>
                  )}
                  {vacaciones === "Pendiente" && (
                    <Button variant="outline" onClick={() => actualizarEmpleado(indice, { vacaciones: "Aprobada" },
                      `Se aprobó la solicitud de ${nombre}.`)}>Aprobar solicitud</Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <p role="status" className="text-sm">{mensaje}</p>
    </main>
  );
}
