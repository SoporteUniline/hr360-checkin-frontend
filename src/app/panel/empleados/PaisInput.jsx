"use client";

import ControlledAutocomplete from "@/components/Inputs/FormAutocomplete/ControlledAutocomplete";
import { FormLabel } from "@/components/ui/form";
import { loadOptionsCountries } from "@/lib/utils";

export default function PaisInput({ form, label, name, onChange }) {
  return (
    <>
      <FormLabel>{label}:</FormLabel>
      <ControlledAutocomplete
        name={name}
        form={form}
        loadOptions={loadOptionsCountries}
        onChange={onChange}
        id="pais_autocomplete"
      />
    </>
  );
}
