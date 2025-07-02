import axios from "axios";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es"; // 👈 Importa el idioma español

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es"); // 👈 Establece el idioma globalmente

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const mxnFormater = (number, decimal = 2) => {
  if (!number) return 0;
  let nueva = parseFloat(number).toFixed(decimal);
  const exp = /(\d)(?=(\d{3})+(?!\d))/g;
  const rep = "$1,";
  return nueva.toString().replace(exp, rep);
};

export const formatearFecha = (fechaISO) => {
  if (!fechaISO) return "";
  return dayjs(fechaISO)
    .tz("America/Mexico_City")
    .format("D [de] MMMM [de] YYYY"); // ejemplo: 1 de junio de 2023
};

export const obtenerIniciales = (nombre) => {
  if (!nombre) return "";

  return nombre
    .trim()
    .split(/\s+/)
    .map((palabra) => palabra[0].toUpperCase())
    .join("");
};

export const loadOptionsCountries = async (inputValue) => {
  try {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/geonames/paises`
    );

    const allCountries = res?.data?.geonames || [];

    // Filtra si hay inputValue
    const filtered = inputValue
      ? allCountries.filter((c) =>
          c.countryName.toLowerCase().includes(inputValue.toLowerCase())
        )
      : allCountries;

    // Retorna en formato para el select
    return filtered.map((item) => ({
      label: item.countryName,
      value: item.countryCode,
    }));
  } catch (err) {
    console.error("Error al buscar países:", err);
    return [];
  }
};

export const loadOptionsEntities = async (inputValue, countryCode) => {
  if (!inputValue || !countryCode) return [];

  try {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/geonames/estados?q=${inputValue}&country=${countryCode}`
    );

    return res?.data?.geonames?.map((item) => ({
      label: item.name,
      value: item.adminCode1,
    }));
  } catch (err) {
    console.error("Error al buscar:", err);
    return [];
  }
};

export const loadOptionsCities = async (
  inputValue,
  selectedState,
  selectedCountry
) => {
  if (!inputValue || !selectedState || !selectedCountry) return [];

  try {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/geonames/ciudades`,
      {
        params: {
          q: inputValue,
          adminCode1: selectedState,
          country: selectedCountry,
        },
      }
    );

    return res?.data?.geonames?.map((item) => ({
      label: item.name,
      value: item.geonameId,
    }));
  } catch (err) {
    console.error("Error al buscar ciudades:", err);
    return [];
  }
};
