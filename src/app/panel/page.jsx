"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PanelPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/panel/inicio");
  }, [router]);

  return null;
}
