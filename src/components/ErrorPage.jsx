import React from "react";
import { ServerCrashIcon } from "lucide-react";

export default function ErrorPage({ message, title = "Ops, hubo un error" }) {
  const errMsg = message ?? "Error desconocido";
  return (
    <div className="flex flex-col justify-center items-center h-100">
      <ServerCrashIcon size={48} />
      <h3 className="text-2xl font-semibold mt-5">{title}</h3>
      <p className="text-gray-500">{errMsg}</p>
    </div>
  );
}
