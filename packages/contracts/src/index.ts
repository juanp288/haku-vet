import { initContract } from "@ts-rest/core";
import { authContract } from "./auth";

export * from "./common/errors";
export * from "./common/roles";
export * from "./auth";

const c = initContract();

export const apiContract = c.router({
  auth: authContract,
});
