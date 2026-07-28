import { Inject, Injectable } from "@nestjs/common";
import type { DocumentType, PrismaClient, Tutor } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

export interface CreateTutorData {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  dataConsentAt: Date;
}

@Injectable()
export class TutorsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * Sin filtro de isActive: el índice único (documentType, documentNumber)
   * de Postgres tampoco lo respeta, así que un acudiente desactivado con
   * el mismo documento igual produce el conflicto de RN-09.
   */
  findByDocument(documentType: DocumentType, documentNumber: string): Promise<Tutor | null> {
    return this.prisma.tutor.findUnique({
      where: { documentType_documentNumber: { documentType, documentNumber } },
    });
  }

  create(data: CreateTutorData): Promise<Tutor> {
    return this.prisma.tutor.create({
      data: { ...data, dataConsent: true },
    });
  }

  findAllActive(): Promise<Tutor[]> {
    return this.prisma.tutor.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
    });
  }
}
