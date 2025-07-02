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
    <section className="max-w-md flex flex-col gap-3 w-[400px]">
      <div className="my-5 border-b-1 border-gray-200">
        <p className="font-semibold">Cambiar contraseña</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          onChange={handleChange}
          value={input.password}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Repite tu contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          onChange={handleChange}
          value={input.confirmPassword}
        />
      </div>
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      <Button
        type="button"
        onClick={onSubmit}
        className="w-full bg-slate-700"
        loading={loading}
      >
        Guardar contraseña
      </Button>
    </section>
  );
}
