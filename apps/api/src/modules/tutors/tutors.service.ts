import { ConflictException, Injectable } from "@nestjs/common";
import type { CreateTutorInput, Tutor as TutorDto } from "@vetclinic/contracts";
import type { Tutor } from "@vetclinic/db";
import { AuditService } from "../../common/audit/audit.service";
import { TutorsRepository } from "./tutors.repository";

/** Solo dígitos y '+' — RN de convenciones de datos (doc 01 §"Convenciones"). */
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

@Injectable()
export class TutorsService {
  constructor(
    private readonly tutorsRepository: TutorsRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(input: CreateTutorInput, userId: string, ip: string): Promise<TutorDto> {
    const documentNumber = input.documentNumber.trim();
    const existing = await this.tutorsRepository.findByDocument(
      input.documentType,
      documentNumber,
    );

    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: "Ya existe un acudiente con este documento.",
        details: { existingTutorId: existing.id },
      });
    }

    const tutor = await this.tutorsRepository.create({
      documentType: input.documentType,
      documentNumber,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: normalizePhone(input.phone),
      phoneAlt: input.phoneAlt ? normalizePhone(input.phoneAlt) : null,
      email: input.email ? input.email : null,
      address: input.address ?? null,
      city: input.city ?? null,
      notes: input.notes ?? null,
      dataConsentAt: new Date(),
    });

    await this.auditService.record({
      userId,
      action: "CREATE",
      entityName: "Tutor",
      entityId: tutor.id,
      ipAddress: ip,
    });

    return this.toDto(tutor);
  }

  async findAll(): Promise<TutorDto[]> {
    const tutors = await this.tutorsRepository.findAllActive();
    return tutors.map((tutor) => this.toDto(tutor));
  }

  private toDto(tutor: Tutor): TutorDto {
    return {
      id: tutor.id,
      documentType: tutor.documentType,
      documentNumber: tutor.documentNumber,
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      phone: tutor.phone,
      phoneAlt: tutor.phoneAlt,
      email: tutor.email,
      address: tutor.address,
      city: tutor.city,
      notes: tutor.notes,
      dataConsent: tutor.dataConsent,
      dataConsentAt: tutor.dataConsentAt ? tutor.dataConsentAt.toISOString() : null,
      isActive: tutor.isActive,
      createdAt: tutor.createdAt.toISOString(),
      updatedAt: tutor.updatedAt.toISOString(),
    };
  }
}
