"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import axiosInstance from "@/lib/axios";

export default function PasswordChange({ user }) {
  const token = Cookies.get("token");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState({
    password: "",
    confirmPassword: "",
  });
  const { enqueueSnackbar } = useSnackbar();

  const handleChange = (e) => {
    const { value, name } = e.target;
    setInput({ ...input, [name]: value });
  };

  const onSubmit = async () => {
    const { password, confirmPassword } = input;
    if (!password || !confirmPassword) {
      setError("Por favor completa ambos campos.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.put(
        `/users/update-password/${user.id_usuario}`,
        input,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      enqueueSnackbar("Se actualizaron tu contraseña exitosamente!", {
        variant: "success",
      });
      setLoading(false);
      setError("");
      setInput({
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al actualizar tu contraseña";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return (
    <section className="max-w-2xl">
      {/* Sección de seguridad con diseño ADAMIA */}
      <div className="bg-gradient-to-br from-green-50 via-white to-green-50 border-2 border-green-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Cambiar contraseña</h3>
            <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
          </div>
        </div>

        {/* Información de seguridad */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="bg-[#2563EB] p-2 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">Recomendaciones de seguridad</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Usa al menos 8 caracteres</li>
                <li>• Combina letras, números y símbolos</li>
                <li>• No uses información personal</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Nueva contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              onChange={handleChange}
              value={input.password}
              placeholder="Ingresa tu nueva contraseña"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirmar contraseña
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              onChange={handleChange}
              value={input.confirmPassword}
              placeholder="Repite tu nueva contraseña"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">⚠️ {error}</p>
            </div>
          )}
          
          <Button
            type="button"
            onClick={onSubmit}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
            loading={loading}
          >
            Guardar contraseña
          </Button>
        </div>
      </div>
    </section>
  );
}
