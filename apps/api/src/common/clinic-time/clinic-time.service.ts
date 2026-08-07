import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../prisma/prisma.constants";
import { type DateParts, getDatePartsInTimezone } from "./clinic-time.util";

const DEFAULT_TIMEZONE = "America/Bogota";

export interface ClinicScheduleSettings {
  timezone: string;
  openingHour: number;
  closingHour: number;
  slotMinutes: number;
  workingDays: number[];
}

const DEFAULT_SETTINGS: ClinicScheduleSettings = {
  timezone: DEFAULT_TIMEZONE,
  openingHour: 8,
  closingHour: 18,
  slotMinutes: 30,
  workingDays: [1, 2, 3, 4, 5, 6],
};

@Injectable()
export class ClinicTimeService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async today(): Promise<DateParts> {
    const settings = await this.getSettings();
    return getDatePartsInTimezone(new Date(), settings.timezone);
  }

  /** C1: horario/franjas de la agenda vienen de ClinicSettings, nunca quemados en el frontend. */
  async getSettings(): Promise<ClinicScheduleSettings> {
    const settings = await this.prisma.clinicSettings.findUnique({
      where: { id: "singleton" },
    });
    if (!settings) {
      return DEFAULT_SETTINGS;
    }
    return {
      timezone: settings.timezone,
      openingHour: settings.openingHour,
      closingHour: settings.closingHour,
      slotMinutes: settings.defaultAppointmentMin,
      workingDays: settings.workingDays,
    };
  }
}
