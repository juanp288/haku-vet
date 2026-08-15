import { Inject, Injectable } from "@nestjs/common";
import type { ClinicSettings, PrismaClient } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

@Injectable()
export class SettingsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  findSingleton(): Promise<ClinicSettings | null> {
    return this.prisma.clinicSettings.findUnique({ where: { id: "singleton" } });
  }
}
