"use client";

import { useEffect, useState } from "react";

async function peticion(url, { token, ...opciones } = {}) {
  const response = await fetch(url, {
    ...opciones,
    cache: "no-store",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opciones.headers,
    },
  });
  if (!response.ok) {
    const error = new Error("No se pudo completar la operación. Intenta de nuevo.");
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? undefined : response.json();
}

export default function VisitaDemo({ url }) {
  const [token, setToken] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      setToken(null);
      setEmpleados([]);
      setMensaje("Tu visita terminó.");
    }, 30 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [token]);

  async function cargar(acceso) {
    setEmpleados(await peticion(`${url}/empleados`, { token: acceso }));
  }

  async function abrir() {
    setOcupado(true);
    setMensaje("");
    try {
      const visita = await peticion(url, { method: "POST" });
      setToken(visita.token);
      await cargar(visita.token);
    } catch (error) {
      setMensaje(error.status === 429 ? "La demo está ocupada. Intenta más tarde." : error.message);
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(evento, id) {
    evento.preventDefault();
    const puesto = new FormData(evento.currentTarget).get("puesto");
    setOcupado(true);
    setMensaje("");
    try {
      await peticion(`${url}/empleados/${id}/puesto`, {
        token,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puesto }),
      });
      await cargar(token);
      setMensaje("Puesto actualizado.");
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setOcupado(false);
    }
  }

  async function salir() {
    setOcupado(true);
    setMensaje("");
    try {
      await peticion(url, { token, method: "DELETE" });
      setToken(null);
      setEmpleados([]);
      setMensaje("Tu visita terminó.");
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Demo de Adamia</h1>
      <p className="mt-3">Prueba con datos ficticios durante una visita de 30 minutos.</p>
      {!token ? (
        <button className="mt-6 rounded bg-slate-900 px-4 py-2 text-white" disabled={ocupado} onClick={abrir}>
          Iniciar visita
        </button>
      ) : (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Empleados</h2>
          <ul className="mt-3 divide-y">
            {empleados.map((empleado) => (
              <li key={empleado.id_empleado} className="py-4">
                <form className="flex flex-wrap items-end gap-3" onSubmit={(evento) => guardar(evento, empleado.id_empleado)}>
                  <div className="grow">
                    <label className="block" htmlFor={`puesto-${empleado.id_empleado}`}>
                      Puesto de {empleado.nombre} {empleado.apellido_paterno}
                    </label>
                    <input
                      id={`puesto-${empleado.id_empleado}`}
                      name="puesto"
                      className="mt-1 w-full rounded border p-2"
                      defaultValue={empleado.puesto ?? ""}
                      maxLength={50}
                      required
                    />
                  </div>
                  <button className="rounded border px-4 py-2" disabled={ocupado}>Guardar</button>
                </form>
              </li>
            ))}
          </ul>
          <button className="mt-4 rounded border px-4 py-2" disabled={ocupado} onClick={salir}>
            Terminar visita
          </button>
        </section>
      )}
      {mensaje && <p className="mt-4" role="status">{mensaje}</p>}
    </main>
  );
}
