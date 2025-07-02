import dynamic from "next/dynamic";

const AutocompleteInput = dynamic(() => import("./ControlledCreatable"), {
  ssr: false,
});

export default AutocompleteInput;
