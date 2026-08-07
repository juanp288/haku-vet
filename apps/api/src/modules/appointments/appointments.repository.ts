import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type AppointmentType, type PrismaClient } from "@vetclinic/db";
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

export interface CreateAppointmentData {
  patientId: string;
  vetId: string;
  createdById: string;
  startsAt: Date;
  endsAt: Date;
  type: AppointmentType;
  reason: string;
  notes: string | null;
}

export type CreateAppointmentResult =
  | { outcome: "ok"; appointment: AppointmentRow }
  | { outcome: "conflict"; conflicting: AppointmentRow };

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

  findActiveVetById(vetId: string): Promise<ActiveVet | null> {
    return this.prisma.user.findFirst({
      where: { id: vetId, role: "VETERINARIO", isActive: true },
      select: { id: true, fullName: true, color: true },
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

  /**
   * RN-01: "la validación corre dentro de una transacción con bloqueo, no
   * como consulta previa" — con varios dispositivos, verificar-y-luego-
   * insertar produce dobles reservas. `pg_advisory_xact_lock` serializa a
   * nivel de Postgres todas las transacciones que compiten por el mismo
   * veterinario: la segunda espera a que la primera confirme o revierta
   * antes de poder leer el estado real de sus citas. Se libera solo al
   * terminar la transacción (commit o rollback), sin tocar schema.prisma.
   */
  async createAppointment(data: CreateAppointmentData): Promise<CreateAppointmentResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.vetId}))`;

      const conflicting = await tx.appointment.findFirst({
        where: {
          vetId: data.vetId,
          status: { notIn: ["CANCELADA", "NO_ASISTIO"] },
          startsAt: { lt: data.endsAt },
          endsAt: { gt: data.startsAt },
        },
        include: APPOINTMENT_ROW_INCLUDE,
      });

      if (conflicting) {
        return { outcome: "conflict", conflicting } as const;
      }

      const appointment = await tx.appointment.create({
        data: {
          patientId: data.patientId,
          vetId: data.vetId,
          createdById: data.createdById,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          type: data.type,
          reason: data.reason,
          notes: data.notes,
        },
        include: APPOINTMENT_ROW_INCLUDE,
      });

      return { outcome: "ok", appointment } as const;
    });
  }
}
