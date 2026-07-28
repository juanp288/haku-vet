/** Forma de un error de respuesta de ts-rest: { status, body, headers }. */
function getErrorBody(error: unknown): Record<string, unknown> | null {
  if (error && typeof error === "object" && "body" in error) {
    const body = (error as { body?: unknown }).body;
    if (body && typeof body === "object") {
      return body as Record<string, unknown>;
    }
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return "No se pudo conectar con el servidor. Intente de nuevo.";
  }
  const body = getErrorBody(error);
  const message = body?.["message"];
  return typeof message === "string" ? message : fallback;
}

export function getApiErrorDetails(error: unknown): Record<string, unknown> | null {
  const body = getErrorBody(error);
  const details = body?.["details"];
  return details && typeof details === "object" ? (details as Record<string, unknown>) : null;
}
