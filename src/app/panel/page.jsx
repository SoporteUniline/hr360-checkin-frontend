"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PanelPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/panel/empleados");
  }, []);

  return null;
}
