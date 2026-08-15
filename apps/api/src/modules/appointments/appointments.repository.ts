import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type AppointmentStatus, type AppointmentType, type PrismaClient } from "@vetclinic/db";
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
  consultation: {
    select: { id: true, status: true },
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

export interface UpdateStatusData {
  status: AppointmentStatus;
  arrivedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

/** `null` cuando el estado cambió entre la lectura y la escritura (o la cita ya no existe). */
export type UpdateStatusResult = AppointmentRow | null;

export type MoveAppointmentResult =
  | { outcome: "ok"; appointment: AppointmentRow }
  | { outcome: "conflict"; conflicting: AppointmentRow }
  | { outcome: "invalid_status" }
  | { outcome: "not_found" };

/** C3: solo se puede reprogramar una cita que aún no pasó — el resto ya sucedió o es un estado final. */
const MOVABLE_STATUSES: readonly AppointmentStatus[] = ["AGENDADA", "CONFIRMADA"];

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

  findById(id: string): Promise<AppointmentRow | null> {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_ROW_INCLUDE,
    });
  }

  /**
   * C3: concurrencia optimista — el `WHERE` incluye el estado que el
   * service leyó justo antes de validar la transición. Si otra petición ya
   * cambió el estado en el medio, `updateMany` no encuentra ninguna fila
   * (`count === 0`) y el service decide si fue un 404 o un 409, sin
   * necesidad de un advisory lock (a diferencia de RN-01, aquí no hay que
   * comparar contra OTRAS filas, solo contra el propio estado anterior).
   */
  async updateStatus(
    id: string,
    fromStatus: AppointmentStatus,
    data: UpdateStatusData,
  ): Promise<UpdateStatusResult> {
    const result = await this.prisma.appointment.updateMany({
      where: { id, status: fromStatus },
      data,
    });
    if (result.count === 0) {
      return null;
    }
    return this.prisma.appointment.findUniqueOrThrow({
      where: { id },
      include: APPOINTMENT_ROW_INCLUDE,
    });
  }

  /**
   * C3: "mover revalida el solapamiento" — reutiliza el mismo
   * `pg_advisory_xact_lock` de `createAppointment` (RN-01), pero excluyendo
   * la propia cita del chequeo de conflicto. El estado (solo se puede mover
   * AGENDADA/CONFIRMADA) también se revalida dentro de la transacción para
   * que no haya ventana entre "leer que es movible" y "escribir el cambio".
   */
  async moveAppointment(id: string, vetId: string, startsAt: Date, endsAt: Date): Promise<MoveAppointmentResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vetId}))`;

      const current = await tx.appointment.findUnique({ where: { id } });
      if (!current) {
        return { outcome: "not_found" } as const;
      }
      if (!MOVABLE_STATUSES.includes(current.status)) {
        return { outcome: "invalid_status" } as const;
      }

      const conflicting = await tx.appointment.findFirst({
        where: {
          id: { not: id },
          vetId,
          status: { notIn: ["CANCELADA", "NO_ASISTIO"] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        include: APPOINTMENT_ROW_INCLUDE,
      });

      if (conflicting) {
        return { outcome: "conflict", conflicting } as const;
      }

      const appointment = await tx.appointment.update({
        where: { id },
        data: { startsAt, endsAt },
        include: APPOINTMENT_ROW_INCLUDE,
      });

      return { outcome: "ok", appointment } as const;
    });
  }
}
