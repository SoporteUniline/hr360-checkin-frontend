"use client";

import ControlledAutocomplete from "@/components/Inputs/FormAutocomplete/ControlledAutocomplete";
import { FormLabel } from "@/components/ui/form";
import { loadOptionsCities } from "@/lib/utils";

export default function CiudadInput({ form, label, name, estado, pais }) {
  const load = async (inputValue) => {
    if (!estado?.value || !pais?.value) return [];
    return await loadOptionsCities(inputValue, estado?.value, pais?.value);
  };

  return (
    <>
      <FormLabel>{label}:</FormLabel>
      <ControlledAutocomplete
        name={name}
        form={form}
        loadOptions={load}
        id="ciudad_autocomplete"
      />
    </>
  );
}
