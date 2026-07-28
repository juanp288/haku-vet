import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Haku Veterinaria",
  description: "Sistema de gestión para clínica veterinaria",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={sourceSerif.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
