import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type Patient, type PrismaClient, type Sex, type Species } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

export interface CreatePatientData {
  name: string;
  species: Species;
  speciesOther: string | null;
  breedId: string | null;
  breedOther: string | null;
  sex: Sex;
  isNeutered: boolean;
  birthDate: Date | null;
  birthDateIsApprox: boolean;
  color: string | null;
  microchip: string | null;
}

/**
 * Trae la raza (nombre), todos los acudientes vinculados (más antiguo
 * primero) y la última consulta CERRADA con peso (B5: "peso más reciente"
 * del encabezado). Esta última siempre viene vacía hasta que D1/D2 existan
 * — la consulta es real, solo que hoy no hay forma de crear consultas.
 */
const WITH_RELATIONS_INCLUDE = {
  breed: { select: { name: true } },
  tutors: {
    orderBy: { createdAt: "asc" },
    include: { tutor: { select: { firstName: true, lastName: true, phone: true } } },
  },
  consultations: {
    where: { status: "CERRADA", weightKg: { not: null } },
    orderBy: { closedAt: "desc" },
    take: 1,
    select: { weightKg: true },
  },
} satisfies Prisma.PatientInclude;

export type PatientWithRelations = Prisma.PatientGetPayload<{
  include: typeof WITH_RELATIONS_INCLUDE;
}>;

export type LinkTutorResult =
  | { outcome: "ok"; patient: PatientWithRelations }
  | { outcome: "already_linked" };

export type SetPrimaryTutorResult =
  | { outcome: "ok"; patient: PatientWithRelations }
  | { outcome: "not_linked" };

export type UnlinkTutorResult =
  | { outcome: "ok"; patient: PatientWithRelations }
  | { outcome: "not_linked" }
  | { outcome: "last_tutor" };

const CONSULTATION_ROW_INCLUDE = {
  vet: { select: { fullName: true } },
} satisfies Prisma.ConsultationInclude;

export type ConsultationRow = Prisma.ConsultationGetPayload<{
  include: typeof CONSULTATION_ROW_INCLUDE;
}>;

export interface ConsultationsPageResult {
  items: ConsultationRow[];
  total: number;
}

@Injectable()
export class PatientsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  findByMicrochip(microchip: string): Promise<Patient | null> {
    return this.prisma.patient.findUnique({ where: { microchip } });
  }

  findById(id: string): Promise<PatientWithRelations | null> {
    return this.prisma.patient.findFirst({
      where: { id, isActive: true },
      include: WITH_RELATIONS_INCLUDE,
    });
  }

  /**
   * Patient + PatientTutor (isPrimary) en una sola transacción: RN-08 exige
   * que toda mascota tenga siempre un acudiente principal desde que existe,
   * nunca un estado intermedio sin ninguno.
   */
  async create(
    data: CreatePatientData,
    tutorId: string,
    tutorRelationship: string | null,
  ): Promise<PatientWithRelations> {
    const created = await this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({ data });
      await tx.patientTutor.create({
        data: {
          patientId: patient.id,
          tutorId,
          isPrimary: true,
          relationship: tutorRelationship,
        },
      });
      return patient;
    });

    return this.findByIdOrThrow(created.id);
  }

  findAllActive(): Promise<PatientWithRelations[]> {
    return this.prisma.patient.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: WITH_RELATIONS_INCLUDE,
    });
  }

  /** B4: agrega un acudiente adicional. Si isPrimary, desmarca al anterior en la misma transacción (RN-08). */
  async linkTutor(
    patientId: string,
    tutorId: string,
    relationship: string | null,
    isPrimary: boolean,
  ): Promise<LinkTutorResult> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.patientTutor.findUnique({
        where: { patientId_tutorId: { patientId, tutorId } },
      });
      if (existing) {
        return "already_linked" as const;
      }

      if (isPrimary) {
        await tx.patientTutor.updateMany({
          where: { patientId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      await tx.patientTutor.create({
        data: { patientId, tutorId, isPrimary, relationship },
      });

      return "ok" as const;
    });

    if (outcome === "already_linked") {
      return { outcome };
    }
    return { outcome: "ok", patient: await this.findByIdOrThrow(patientId) };
  }

  /** B4: marca un acudiente ya vinculado como principal; el anterior deja de serlo (RN-08). */
  async setPrimaryTutor(patientId: string, tutorId: string): Promise<SetPrimaryTutorResult> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const link = await tx.patientTutor.findUnique({
        where: { patientId_tutorId: { patientId, tutorId } },
      });
      if (!link) {
        return "not_linked" as const;
      }
      if (!link.isPrimary) {
        await tx.patientTutor.updateMany({
          where: { patientId, isPrimary: true },
          data: { isPrimary: false },
        });
        await tx.patientTutor.update({ where: { id: link.id }, data: { isPrimary: true } });
      }
      return "ok" as const;
    });

    if (outcome === "not_linked") {
      return { outcome };
    }
    return { outcome: "ok", patient: await this.findByIdOrThrow(patientId) };
  }

  /**
   * B4: desvincula un acudiente. Rechaza dejar la mascota sin ninguno (caso
   * límite #3 del doc de reglas de negocio) y, si el desvinculado era el
   * principal, promueve automáticamente al vinculado más antiguo que quede
   * para no romper RN-08 (caso límite #2: sigue habiendo principal).
   */
  async unlinkTutor(patientId: string, tutorId: string): Promise<UnlinkTutorResult> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const link = await tx.patientTutor.findUnique({
        where: { patientId_tutorId: { patientId, tutorId } },
      });
      if (!link) {
        return "not_linked" as const;
      }

      const totalLinked = await tx.patientTutor.count({ where: { patientId } });
      if (totalLinked <= 1) {
        return "last_tutor" as const;
      }

      await tx.patientTutor.delete({ where: { id: link.id } });

      if (link.isPrimary) {
        const next = await tx.patientTutor.findFirst({
          where: { patientId },
          orderBy: { createdAt: "asc" },
        });
        if (next) {
          await tx.patientTutor.update({ where: { id: next.id }, data: { isPrimary: true } });
        }
      }

      return "ok" as const;
    });

    if (outcome !== "ok") {
      return { outcome };
    }
    return { outcome: "ok", patient: await this.findByIdOrThrow(patientId) };
  }

  /**
   * B5: últimas consultas, orden cronológico inverso, paginadas. RN-07: un
   * BORRADOR solo lo ve su autor (vetId) o ADMIN — nunca otro veterinario
   * ni AUXILIAR. La redacción de campos para AUXILIAR (RN-18, solo signos
   * vitales) vive en el service, no aquí: el repository solo filtra
   * visibilidad de filas, no columnas.
   */
  async findConsultationsPage(
    patientId: string,
    currentUserId: string,
    isAdmin: boolean,
    page: number,
    pageSize: number,
  ): Promise<ConsultationsPageResult> {
    const where: Prisma.ConsultationWhereInput = {
      patientId,
      ...(isAdmin
        ? {}
        : { OR: [{ status: "CERRADA" }, { status: "BORRADOR", vetId: currentUserId }] }),
    };

    const [items, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: CONSULTATION_ROW_INCLUDE,
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return { items, total };
  }

  private findByIdOrThrow(id: string): Promise<PatientWithRelations> {
    return this.prisma.patient.findUniqueOrThrow({
      where: { id },
      include: WITH_RELATIONS_INCLUDE,
    });
  }
}
