import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "@vetclinic/contracts";
import {
  describeInvalidTransition,
  getValidNextStatuses,
  isValidAppointmentTransition,
} from "./appointment-state-machine";

const ALL_STATUSES: AppointmentStatus[] = [
  "AGENDADA",
  "CONFIRMADA",
  "EN_SALA",
  "EN_ATENCION",
  "ATENDIDA",
  "NO_ASISTIO",
  "CANCELADA",
];

describe("appointment-state-machine (RN-04)", () => {
  it.each([
    ["AGENDADA", "CONFIRMADA"],
    ["AGENDADA", "NO_ASISTIO"],
    ["AGENDADA", "CANCELADA"],
    ["CONFIRMADA", "EN_SALA"],
    ["CONFIRMADA", "NO_ASISTIO"],
    ["EN_SALA", "EN_ATENCION"],
    ["EN_SALA", "NO_ASISTIO"],
    ["EN_ATENCION", "ATENDIDA"],
  ] as const)("permite %s → %s", (from, to) => {
    expect(isValidAppointmentTransition(from, to)).toBe(true);
  });

  it.each([
    ["AGENDADA", "EN_SALA"],
    ["AGENDADA", "EN_ATENCION"],
    ["AGENDADA", "ATENDIDA"],
    ["CONFIRMADA", "ATENDIDA"],
    ["CONFIRMADA", "CANCELADA"],
    ["CONFIRMADA", "AGENDADA"],
    ["EN_SALA", "ATENDIDA"],
    ["EN_SALA", "CANCELADA"],
    ["EN_ATENCION", "CANCELADA"],
    ["EN_ATENCION", "NO_ASISTIO"],
  ] as const)("rechaza %s → %s", (from, to) => {
    expect(isValidAppointmentTransition(from, to)).toBe(false);
  });

  it("los estados finales (ATENDIDA, NO_ASISTIO, CANCELADA) no tienen transiciones válidas", () => {
    for (const final of ["ATENDIDA", "NO_ASISTIO", "CANCELADA"] as const) {
      for (const to of ALL_STATUSES) {
        expect(isValidAppointmentTransition(final, to)).toBe(false);
      }
      expect(getValidNextStatuses(final)).toHaveLength(0);
    }
  });

  it("describeInvalidTransition explica los estados válidos cuando existen", () => {
    expect(describeInvalidTransition("AGENDADA", "ATENDIDA")).toContain("confirmada");
  });

  it("describeInvalidTransition explica que es un estado final cuando no hay salidas", () => {
    expect(describeInvalidTransition("CANCELADA", "AGENDADA")).toContain("estado final");
  });
});
