import { initContract } from "@ts-rest/core";

export * from "./common/errors";
export * from "./common/roles";

/**
 * Punto de entrada de ts-rest. Cada historia agrega su contrato de dominio
 * aquí (ej. `c.router({ auth: authContract, patients: patientsContract })`).
 * Vacío hasta que se implemente la primera historia (A1).
 */
const c = initContract();

export const apiContract = c.router({});
