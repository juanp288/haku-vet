/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Los archivos de /public (logo.jpeg, etc.) se sirven siempre en la
        // misma URL, sin hash de contenido — sin esto, el navegador puede
        // quedarse con una copia vieja indefinidamente y no detectar que el
        // archivo cambió (ej. al reemplazar el logo), obligando a un hard
        // refresh. "no-cache" no significa "sin caché": el navegador guarda
        // el archivo igual, pero SIEMPRE revalida con el servidor antes de
        // usarlo (ETag) — si no cambió, la respuesta es un 304 rápido sin
        // volver a descargar nada; si cambió, se sirve la versión nueva de
        // inmediato, sin recarga forzada.
        source: "/logo.jpeg",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
