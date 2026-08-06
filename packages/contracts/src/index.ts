import { initContract } from "@ts-rest/core";
import { authContract } from "./auth";
import { breedsContract } from "./breeds";
import { patientsContract } from "./patients";
import { searchContract } from "./search";
import { tutorsContract } from "./tutors";

export * from "./common/errors";
export * from "./common/roles";
export * from "./common/sex";
export * from "./common/species";
export * from "./auth";
export * from "./tutors";
export * from "./search";
export * from "./breeds";
export * from "./consultations";
export * from "./patients";

const c = initContract();

export const apiContract = c.router({
  auth: authContract,
  tutors: tutorsContract,
  search: searchContract,
  breeds: breedsContract,
  patients: patientsContract,
});
