"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { FirstAidKit } from "@phosphor-icons/react/dist/csr/FirstAidKit";
import { Syringe } from "@phosphor-icons/react/dist/csr/Syringe";
import { loginSchema, type LoginInput } from "@vetclinic/contracts";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { useLogin } from "./use-auth";

const HIGHLIGHTS = [
  { icon: CalendarCheck, label: "Agenda por veterinario" },
  { icon: FirstAidKit, label: "Historia clínica SOAP" },
  { icon: Syringe, label: "Carnet de vacunación" },
];

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

  const apiErrorMessage = getApiErrorMessage(
    login.error,
    "No se pudo iniciar sesión. Intente de nuevo.",
  );

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <div className="flex items-center justify-center p-12">
        <div className="w-full max-w-[360px]">
          <img
            src="/logo.jpeg"
            alt="Kahu"
            width={76}
            height={76}
            className="rounded-[20px] object-cover shadow-[0_8px_24px_rgba(14,27,42,.10)]"
          />
          <h1 className="mb-1.5 mt-[26px] font-heading text-[30px] leading-tight tracking-[-0.02em]">
            Bienvenido de vuelta
          </h1>
          <p className="mb-7 text-[14.5px] text-neutral-600">
            Ingresa con tu cuenta del personal de la clínica.
          </p>

          <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
            <div className="mb-3.5 space-y-1.5">
              <Label htmlFor="login-email">Correo</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="camila.torres@kahu.co"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[13px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-[18px] space-y-1.5">
              <Label htmlFor="login-pass">Contraseña</Label>
              <Input
                id="login-pass"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-[13px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            {apiErrorMessage && (
              <p className="mb-3 text-[13px] text-destructive">{apiErrorMessage}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
              {login.isPending ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>

          <p className="mt-[22px] text-[12.5px] leading-relaxed text-neutral-500">
            La sesión dura 12 horas. Tras 5 intentos fallidos el acceso se bloquea 15
            minutos.
          </p>
        </div>
      </div>

      <div className="hidden items-end bg-[linear-gradient(150deg,#0B5C93_0%,#1B8DE0_48%,#4FAE33_100%)] p-14 lg:flex">
        <div className="text-white">
          <div className="text-[12px] font-bold uppercase tracking-[0.16em] opacity-75">
            Kahu · Gestión clínica
          </div>
          <div className="mt-3.5 max-w-[15ch] text-[34px] font-extrabold leading-[1.15] tracking-[-0.025em]">
            La historia de cada paciente, en un solo lugar.
          </div>
          <div className="mt-[34px] flex gap-6 text-[13px] opacity-90">
            {HIGHLIGHTS.map(({ icon: HighlightIcon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <HighlightIcon size={16} weight="duotone" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
