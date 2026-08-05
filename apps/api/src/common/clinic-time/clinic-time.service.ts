import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../prisma/prisma.constants";
import { type DateParts, getDatePartsInTimezone } from "./clinic-time.util";

const DEFAULT_TIMEZONE = "America/Bogota";

@Injectable()
export class ClinicTimeService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async today(): Promise<DateParts> {
    const settings = await this.prisma.clinicSettings.findUnique({
      where: { id: "singleton" },
    });
    return getDatePartsInTimezone(new Date(), settings?.timezone ?? DEFAULT_TIMEZONE);
  }
}
