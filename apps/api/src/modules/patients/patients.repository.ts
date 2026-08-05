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

/** Trae la raza (nombre) y el acudiente principal, lo único que necesita el DTO. */
const WITH_RELATIONS_INCLUDE = {
  breed: { select: { name: true } },
  tutors: {
    where: { isPrimary: true },
    take: 1,
    include: { tutor: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.PatientInclude;

export type PatientWithRelations = Prisma.PatientGetPayload<{
  include: typeof WITH_RELATIONS_INCLUDE;
}>;

@Injectable()
export class PatientsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  findByMicrochip(microchip: string): Promise<Patient | null> {
    return this.prisma.patient.findUnique({ where: { microchip } });
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

    return this.prisma.patient.findUniqueOrThrow({
      where: { id: created.id },
      include: WITH_RELATIONS_INCLUDE,
    });
  }

  findAllActive(): Promise<PatientWithRelations[]> {
    return this.prisma.patient.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: WITH_RELATIONS_INCLUDE,
    });
  }
}
