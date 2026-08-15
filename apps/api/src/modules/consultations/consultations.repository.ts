import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

const CONSULTATION_DETAIL_INCLUDE = {
  vet: { select: { fullName: true } },
  patient: { select: { id: true, name: true } },
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
   * RN-05: solo actualiza si sigue en BORRADOR — el `WHERE` incluye el
   * estado esperado (igual que AppointmentsRepository.updateStatus en C3),
   * así que una carrera contra un cierre concurrente no pisa datos: si
   * `count` da 0, el service decide si fue "ya no existe/no es visible" o
   * "se cerró en el medio".
   */
  async updateDraft(id: string, data: UpdateConsultationDraftData): Promise<ConsultationDetailRow | null> {
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
}
