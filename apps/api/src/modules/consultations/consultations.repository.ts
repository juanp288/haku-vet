import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

const CONSULTATION_DETAIL_INCLUDE = {
  vet: { select: { fullName: true } },
  patient: { select: { id: true, name: true } },
  /** D4: "puede haber varias adendas" — orden de creación (más antigua primero), como un registro que crece. */
  addenda: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { fullName: true } } },
  },
} satisfies Prisma.ConsultationInclude;

export type ConsultationDetailRow = Prisma.ConsultationGetPayload<{
  include: typeof CONSULTATION_DETAIL_INCLUDE;
}>;

export interface CreateConsultationData {
  patientId: string;
  vetId: string;
  appointmentId: string | null;
  reason: string;
}

export interface UpdateConsultationDraftData {
  reason?: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  prescription?: string | null;
  weightKg?: number | null;
  temperatureC?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  bodyConditionScore?: number | null;
  mucousMembranes?: string | null;
  capillaryRefill?: number | null;
  nextControlAt?: Date | null;
}

@Injectable()
export class ConsultationsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  create(data: CreateConsultationData): Promise<ConsultationDetailRow> {
    return this.prisma.consultation.create({
      data: {
        patientId: data.patientId,
        vetId: data.vetId,
        appointmentId: data.appointmentId,
        reason: data.reason,
      },
      include: CONSULTATION_DETAIL_INCLUDE,
    });
  }

  /**
   * RN-07: un BORRADOR solo lo ve su autor (vetId) o ADMIN — una CERRADA es
   * historia clínica compartida, visible para cualquiera con acceso a esta
   * consulta. Mismo patrón que PatientsRepository.findConsultationsPage.
   */
  findVisibleById(id: string, currentUserId: string, isAdmin: boolean): Promise<ConsultationDetailRow | null> {
    return this.prisma.consultation.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { OR: [{ status: "CERRADA" }, { status: "BORRADOR", vetId: currentUserId }] }),
      },
      include: CONSULTATION_DETAIL_INCLUDE,
    });
  }

  /**
   * D2: existencia simple, sin el filtro de autoría de RN-07 — AUXILIAR
   * nunca es el autor de una consulta (no puede crearlas), así que
   * `findVisibleById` jamás dejaría pasar su escritura de signos vitales.
   * "Editar signos vitales" es un permiso aparte de "ver la historia
   * clínica": no hace falta ver el SOAP para registrar un peso.
   */
  findById(id: string): Promise<ConsultationDetailRow | null> {
    return this.prisma.consultation.findUnique({
      where: { id },
      include: CONSULTATION_DETAIL_INCLUDE,
    });
  }

  /**
   * D2: "el peso se muestra junto al último registrado" — la última
   * consulta CERRADA de este paciente con peso, igual filtro que
   * Patient.latestWeightKg (B5). Excluye la propia consulta: una vez D3
   * exista y esta consulta se cierre, no debe compararse consigo misma.
   */
  async findLatestClosedWeight(
    patientId: string,
    excludeConsultationId: string,
  ): Promise<Prisma.Decimal | null> {
    const last = await this.prisma.consultation.findFirst({
      where: {
        patientId,
        status: "CERRADA",
        weightKg: { not: null },
        id: { not: excludeConsultationId },
      },
      orderBy: { occurredAt: "desc" },
      select: { weightKg: true },
    });
    return last?.weightKg ?? null;
  }

  /**
   * RN-05: solo actualiza si sigue en BORRADOR — el `WHERE` incluye el
   * estado esperado (igual que AppointmentsRepository.updateStatus en C3),
   * así que una carrera contra un cierre concurrente no pisa datos: si
   * `count` da 0, el service decide si fue "ya no existe/no es visible" o
   * "se cerró en el medio".
   */
  async updateDraft(id: string, data: UpdateConsultationDraftData): Promise<ConsultationDetailRow | null> {
    if (Object.keys(data).length === 0) {
      // Nada que actualizar (ej. updateVitals con un body sin campos reconocidos,
      // ya despojado por Zod) — `updateMany` con `data: {}` no hace ningún
      // UPDATE real y devolvería count 0 aunque la fila exista, lo que el
      // resto de este método interpretaría como "se cerró en el medio". Se
      // confirma en su lugar que la fila sigue existiendo en BORRADOR.
      return this.prisma.consultation.findFirst({
        where: { id, status: "BORRADOR" },
        include: CONSULTATION_DETAIL_INCLUDE,
      });
    }
    const result = await this.prisma.consultation.updateMany({
      where: { id, status: "BORRADOR" },
      data,
    });
    if (result.count === 0) {
      return null;
    }
    return this.prisma.consultation.findUniqueOrThrow({
      where: { id },
      include: CONSULTATION_DETAIL_INCLUDE,
    });
  }

  /**
   * D3/RN-06: las 4 escrituras (cierre, cita→ATENDIDA, Reminder CONTROL,
   * AuditLog) van en una sola transacción — por eso el AuditLog se escribe
   * acá directo con `tx`, en vez de vía AuditService (que siempre usa el
   * cliente singleton y no podría participar de esta transacción).
   * Concurrencia optimista igual que updateDraft: si `count` da 0, ya no
   * estaba en BORRADOR (alguien más la cerró en el medio).
   */
  async close(id: string, userId: string, ip: string): Promise<CloseConsultationResult> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.consultation.updateMany({
        where: { id, status: "BORRADOR" },
        data: { status: "CERRADA", closedAt: new Date() },
      });
      if (result.count === 0) {
        return { outcome: "conflict" } as const;
      }

      const consultation = await tx.consultation.findUniqueOrThrow({
        where: { id },
        include: CONSULTATION_DETAIL_INCLUDE,
      });

      if (consultation.appointmentId) {
        await tx.appointment.update({
          where: { id: consultation.appointmentId },
          data: { status: "ATENDIDA" },
        });
      }

      if (consultation.nextControlAt) {
        const primaryTutor = await tx.patientTutor.findFirst({
          where: { patientId: consultation.patientId, isPrimary: true },
          select: { tutorId: true },
        });
        // RN-08 garantiza que siempre hay un principal; si por alguna razón
        // no lo hay, no bloqueamos el cierre clínico por falta de a quién
        // recordarle — simplemente no se genera el recordatorio.
        //
        // Nota: @@unique([patientId,type,vaccineApplicationId,dueAt]) no
        // deduplica de verdad cuando vaccineApplicationId es NULL (Postgres
        // trata cada NULL como distinto en una constraint UNIQUE, y el tipo
        // que genera Prisma para esta clave compuesta ni siquiera acepta
        // `null` en ese campo) — así que un `upsert` acá sería una falsa
        // idempotencia. `create` simple: en el peor caso, dos consultas
        // distintas del mismo paciente con el mismo nextControlAt generan
        // dos recordatorios en vez de uno deduplicado, no un dato incorrecto.
        if (primaryTutor) {
          await tx.reminder.create({
            data: {
              patientId: consultation.patientId,
              tutorId: primaryTutor.tutorId,
              type: "CONTROL",
              dueAt: consultation.nextControlAt,
              message: `Control de seguimiento para ${consultation.patient.name}`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: { userId, action: "CLOSE", entityName: "Consultation", entityId: id, ipAddress: ip },
      });

      return { outcome: "ok", consultation } as const;
    });
  }

  /**
   * D4: "una adenda no se edita ni se borra" — por eso no hay
   * updateAddendum/deleteAddendum en este repository; el modelo Addendum ni
   * siquiera tiene `updatedAt` en schema.prisma. Solo create + lectura (ya
   * incluida en CONSULTATION_DETAIL_INCLUDE).
   */
  async createAddendum(consultationId: string, authorId: string, content: string): Promise<void> {
    await this.prisma.addendum.create({ data: { consultationId, authorId, content } });
  }
}

export type CloseConsultationResult =
  | { outcome: "ok"; consultation: ConsultationDetailRow }
  | { outcome: "conflict" };
