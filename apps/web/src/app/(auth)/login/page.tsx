import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar — Kahu",
};

export default function LoginPage() {
  return <LoginForm />;
}
