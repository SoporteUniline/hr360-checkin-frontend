"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EmpleadoPanelPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/empleado/inicio");
  }, []);

  return null;
}
