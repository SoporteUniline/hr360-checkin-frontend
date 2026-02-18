"use client";

import { Lock, CreditCard } from "lucide-react";

export default function SubscriptionRequiredView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-10 text-center">
      <div className="mb-4 rounded-full bg-amber-100 p-4">
        <Lock className="size-10 text-amber-600" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900">
        Suscripción Requerida
      </h2>
      <p className="mb-8 max-w-sm text-gray-500">
        Lo sentimos, tu empresa no cuenta con un contrato activo en este
        momento. Para acceder a las funciones del panel, por favor contacta a
        administración para renovar tu plan.
      </p>
      <a
        href={`https://wa.me/523171035768?text=${encodeURIComponent(
          "Hola, me gustaría renovar mi plan en Aldamia",
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        <CreditCard className="size-4" />
        Renovar ahora
      </a>
    </div>
  );
}
