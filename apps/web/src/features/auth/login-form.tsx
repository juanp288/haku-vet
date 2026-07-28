"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@vetclinic/contracts";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "./use-auth";

function getLoginErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return "No se pudo conectar con el servidor. Intente de nuevo.";
  }
  if (typeof error === "object" && "body" in error) {
    const body = (error as { body?: unknown }).body;
    if (
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  }
  return "No se pudo iniciar sesión. Intente de nuevo.";
}

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginInput) => {
    login.mutate(
      { body: data },
      { onSuccess: () => router.push("/agenda") },
    );
  };

  const apiErrorMessage = getLoginErrorMessage(login.error);

  return (
    <div className="flex min-h-screen items-center justify-start px-[12vw] py-8">
      <div className="w-full max-w-[380px]">
        <div className="mb-3 font-heading text-[13px] uppercase tracking-[0.14em] text-brand-700">
          VetClínica · Sistema de gestión
        </div>
        <h1 className="mb-2 font-heading text-[40px] leading-[1.05]">
          Entrar al sistema
        </h1>
        <p className="mb-6 text-[15px] opacity-70">
          Correo y contraseña del personal de la clínica.
        </p>

        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
          <div className="mb-4 space-y-1.5">
            <Label htmlFor="login-email">Correo</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="camila.torres@vetclinica.co"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[13px] text-brand-2-700">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-2 space-y-1.5">
            <Label htmlFor="login-pass">Contraseña</Label>
            <Input
              id="login-pass"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-[13px] text-brand-2-700">{errors.password.message}</p>
            )}
          </div>

          {apiErrorMessage && (
            <p className="mb-3 text-[13px] text-brand-2-700">{apiErrorMessage}</p>
          )}

          <Button type="submit" className="mt-3 w-full" disabled={login.isPending}>
            {login.isPending ? "Entrando…" : "Iniciar sesión"}
          </Button>
        </form>

        <p className="mt-6 text-[12px] opacity-55">
          Sesión válida por 12 horas. Después de 5 intentos fallidos el acceso se
          bloquea 15 minutos.
        </p>
      </div>
    </div>
  );
}
