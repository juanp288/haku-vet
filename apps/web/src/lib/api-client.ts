import { initTsrReactQuery } from "@ts-rest/react-query/v5";
import { apiContract } from "@vetclinic/contracts";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

/**
 * Cliente tipado de la API. `credentials: "include"` es obligatorio porque
 * la sesión vive en una cookie httpOnly — sin esto el navegador no la envía
 * en requests cross-origin (web en :3000, api en :3001).
 */
export const tsr = initTsrReactQuery(apiContract, {
  baseUrl: API_URL,
  baseHeaders: {},
  credentials: "include",
});
