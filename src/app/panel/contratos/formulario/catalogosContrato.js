"use client";

// Catálogos que usa el contrato (28/11/2026, pedido del dueño: «puesto y departamento hoy son texto libre; deben
// elegirse del catálogo»). Son los mismos de las pantallas Catálogos › Puestos, Departamentos y Unidades de negocio,
// filtrados por la empresa del contrato (?id_empresa=). El contrato guarda el NOMBRE (texto), como siempre: no cambia
// lo que espera el servidor (puesto, departamento y lugar_trabajo son texto en /contratos).
// Dar de alta desde el contrato: POST con { nombre, id_empresa } (lo mismo que las ventanas de Catálogos). El servidor
// decide los permisos (área «empleados», edición); aquí solo se oculta «+ Crear» a quien no puede editar esa pantalla.
import useSWR from "swr";
import Cookies from "js-cookie";
import axios from "@/lib/axios";
import { nivelEnRuta } from "@/lib/permisos/permisos.mjs";

const conToken = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` } });

/** Cada catálogo: dónde se lee y se crea, cómo se llama el nombre en la respuesta y la pantalla que da el permiso. */
export const CATALOGOS = {
  puesto: {
    ruta: "/checador/puestos", lista: "puestos", nombre: (x) => x.nombre_puesto || x.nombre, pantalla: "/panel/catalogos/puestos",
    titulo: "Crear puesto", etiqueta: "Nombre del puesto", descripcion: "Se agrega al catálogo de puestos de la empresa y queda elegido en este contrato.",
    creado: (n) => `Puesto «${n}» creado.`,
  },
  departamento: {
    ruta: "/checador/departamentos", lista: "departamentos", nombre: (x) => x.nombre, pantalla: "/panel/catalogos/departamentos",
    titulo: "Crear departamento o área", etiqueta: "Nombre del departamento o área", descripcion: "Se agrega al catálogo de departamentos de la empresa y queda elegido en este contrato.",
    creado: (n) => `Departamento «${n}» creado.`,
  },
  lugar: {
    ruta: "/checador/sucursales", lista: "sucursales", nombre: (x) => x.nombre, pantalla: "/panel/catalogos/unidades-de-negocio",
    titulo: "Crear lugar de trabajo", etiqueta: "Nombre de la sucursal o unidad de negocio", descripcion: "Se agrega a las unidades de negocio de la empresa (los demás datos, como el logo o la razón social, se completan en Catálogos).",
    creado: (n) => `Lugar de trabajo «${n}» creado.`,
  },
};

const nombres = (datos, cat) =>
  [...new Set((Array.isArray(datos?.[cat.lista]) ? datos[cat.lista] : []).map(cat.nombre).map((n) => String(n ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));

/** Nombres del catálogo `tipo` de la empresa, en orden. Si falla, lista vacía (el campo sigue mostrando lo guardado). */
export async function leerCatalogo(tipo, idEmpresa) {
  const cat = CATALOGOS[tipo];
  const r = await axios.get(`${cat.ruta}?id_empresa=${encodeURIComponent(idEmpresa)}`, conToken());
  return nombres(r.data, cat);
}

/**
 * Da de alta `nombre` en el catálogo. → { nombre, yaExistia }. Si ya existía (409), regresa el nombre tal como está en
 * el catálogo para elegirlo en lugar de crear otro igual.
 */
export async function crearEnCatalogo(tipo, idEmpresa, nombre) {
  const cat = CATALOGOS[tipo];
  try {
    const r = await axios.post(cat.ruta, { nombre, id_empresa: Number(idEmpresa) }, conToken());
    return { nombre: String(cat.nombre(r.data ?? {}) || nombre).trim(), yaExistia: false };
  } catch (e) {
    if (e?.response?.status !== 409) throw e;
    const lista = await leerCatalogo(tipo, idEmpresa).catch(() => []);
    const igual = lista.find((n) => n.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"));
    return { nombre: igual ?? nombre, yaExistia: true };
  }
}

/** ¿Quien usa el contrato puede dar de alta en ese catálogo? (la misma regla que la pantalla del catálogo). */
export const puedeCrearEn = (tipo, permisosSesion) => nivelEnRuta(CATALOGOS[tipo].pantalla, permisosSesion) === "editar";

/** Los tres catálogos de la empresa del contrato, con SWR. `refrescar(tipo)` vuelve a leer uno (después de crear). */
export function useCatalogosContrato(idEmpresa) {
  const usar = (tipo) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSWR(idEmpresa ? ["contrato-catalogo-nombres", tipo, String(idEmpresa)] : null, () => leerCatalogo(tipo, idEmpresa).catch(() => []), { revalidateOnFocus: false });
  const puesto = usar("puesto");
  const departamento = usar("departamento");
  const lugar = usar("lugar");
  const swr = { puesto, departamento, lugar };
  return {
    puesto: puesto.data ?? [], departamento: departamento.data ?? [], lugar: lugar.data ?? [],
    cargando: { puesto: puesto.isLoading, departamento: departamento.isLoading, lugar: lugar.isLoading },
    refrescar: (tipo, nombre) => swr[tipo].mutate((lista = []) => (lista.includes(nombre) ? lista : [...lista, nombre].sort((a, b) => a.localeCompare(b, "es"))), { revalidate: true }),
  };
}
