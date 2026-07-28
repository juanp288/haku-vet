import { initContract } from "@ts-rest/core";
import { authContract } from "./auth";
import { searchContract } from "./search";
import { tutorsContract } from "./tutors";

export * from "./common/errors";
export * from "./common/roles";
export * from "./common/species";
export * from "./auth";
export * from "./tutors";
export * from "./search";

const c = initContract();

export const apiContract = c.router({
  auth: authContract,
  tutors: tutorsContract,
  search: searchContract,
});
