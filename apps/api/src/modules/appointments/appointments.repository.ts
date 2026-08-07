import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

const APPOINTMENT_ROW_INCLUDE = {
  patient: {
    select: {
      id: true,
      name: true,
      species: true,
      tutors: {
        where: { isPrimary: true },
        take: 1,
        include: { tutor: { select: { firstName: true, lastName: true } } },
      },
    },
  },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_ROW_INCLUDE;
}>;

export interface ActiveVet {
  id: string;
  fullName: string;
  color: string | null;
}

@Injectable()
export class AppointmentsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** C1: "una columna por veterinario activo" — inactivos no aparecen en la agenda del día. */
  findActiveVets(): Promise<ActiveVet[]> {
    return this.prisma.user.findMany({
      where: { role: "VETERINARIO", isActive: true },
      select: { id: true, fullName: true, color: true },
      orderBy: { fullName: "asc" },
    });
  }

  /** `end` es exclusivo — el rango [start, end) lo arma el service con RN-19. */
  findAppointmentsInRange(start: Date, end: Date): Promise<AppointmentRow[]> {
    return this.prisma.appointment.findMany({
      where: { startsAt: { gte: start, lt: end } },
      orderBy: { startsAt: "asc" },
      include: APPOINTMENT_ROW_INCLUDE,
    });
  }
}
