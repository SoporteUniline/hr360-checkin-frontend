import dynamic from "next/dynamic";

const AutocompleteInput = dynamic(() => import("./ControlledAutocomplete"), {
  ssr: false,
});

export default AutocompleteInput;
