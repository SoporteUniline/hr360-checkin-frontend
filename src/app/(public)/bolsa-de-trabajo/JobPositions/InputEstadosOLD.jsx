"use client";

import { useState } from "react";
import axios from "axios";
import AutocompleteInput from "@/components/Inputs/Autocomplete/index";

export default function InputEstados({ setFilterValues }) {
  const [selectedCountry, setSelectedCountry] = useState(null);

  const loadOptionsEntities = async (inputValue) => {
    if (!inputValue) return [];

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/geonames/estados?q=${inputValue}`
      );

      return res?.data?.geonames?.map((item) => ({
        label: item.name,
        value: item.adminCode1,
        code: item.adminCode1,
      }));
    } catch (err) {
      console.error("Error al buscar:", err);
      return [];
    }
  };

  const loadOptionsCities = async (inputValue) => {
    if (!selectedCountry) return [];
    if (!inputValue) return [];

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/geonames/ciudades?q=${inputValue}&adminCode1=${selectedCountry}`
      );

      return res?.data?.geonames?.map((item) => ({
        label: item.name,
        value: item.countryId,
      }));
    } catch (err) {
      console.error("Error al buscar:", err);
      return [];
    }
  };

  const handleOnSelect = (selectedOption) => {
    setFilterValues((st) => ({
      ...st,
      entidad: selectedOption.label,
      page: 1,
    }));
    setSelectedCountry(selectedOption.value);
  };

  const handleOnCitiesSelect = (item) => {
    setFilterValues((st) => ({ ...st, ciudad: item.label, page: 1 }));
  };

  return (
    <div className="flex gap-3 w-full max-w-md">
      <AutocompleteInput
        loadOptions={loadOptionsEntities}
        handleChange={handleOnSelect}
        placeholder="Buscar por estado"
        id="estado_autocomplete"
      />
      <AutocompleteInput
        loadOptions={loadOptionsCities}
        handleChange={handleOnCitiesSelect}
        disabled={!selectedCountry}
        placeholder="Buscar por ciudad"
        id="ciudad_autocomplete"
      />
    </div>
  );
}
