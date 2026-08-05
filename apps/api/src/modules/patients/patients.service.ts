import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  CreatePatientInput,
  LinkTutorInput,
  Patient as PatientDto,
} from "@vetclinic/contracts";
import { AuditService } from "../../common/audit/audit.service";
import { ClinicTimeService } from "../../common/clinic-time/clinic-time.service";
import { formatAgeLabel, getDatePartsUTC, type DateParts } from "../../common/clinic-time/clinic-time.util";
import { BreedsRepository } from "../breeds/breeds.repository";
import { TutorsRepository } from "../tutors/tutors.repository";
import { PatientsRepository, type PatientWithRelations } from "./patients.repository";

function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly tutorsRepository: TutorsRepository,
    private readonly breedsRepository: BreedsRepository,
    private readonly clinicTimeService: ClinicTimeService,
    private readonly auditService: AuditService,
  ) {}

  async create(input: CreatePatientInput, userId: string, ip: string): Promise<PatientDto> {
    const tutor = await this.tutorsRepository.findById(input.tutorId);
    if (!tutor) {
      throw new NotFoundException("El acudiente seleccionado no existe.");
    }

    const breedId = input.breedId ? input.breedId : null;
    if (breedId) {
      const breed = await this.breedsRepository.findById(breedId);
      if (!breed || breed.species !== input.species) {
        throw new BadRequestException(
          "La raza seleccionada no corresponde a la especie indicada.",
        );
      }
    }

    const microchip = normalizeOptionalText(input.microchip);
    if (microchip) {
      const existing = await this.patientsRepository.findByMicrochip(microchip);
      if (existing) {
        throw new ConflictException({
          statusCode: 409,
          message: "Ya existe una mascota registrada con este microchip.",
          details: { existingPatientId: existing.id },
        });
      }
    }

    const patient = await this.patientsRepository.create(
      {
        name: input.name.trim(),
        species: input.species,
        speciesOther: normalizeOptionalText(input.speciesOther),
        breedId,
        breedOther: breedId ? null : normalizeOptionalText(input.breedOther),
        sex: input.sex,
        isNeutered: input.isNeutered,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        birthDateIsApprox: input.birthDate ? input.birthDateIsApprox : false,
        color: normalizeOptionalText(input.color),
        microchip,
      },
      input.tutorId,
      normalizeOptionalText(input.tutorRelationship),
    );

    await this.auditService.record({
      userId,
      action: "CREATE",
      entityName: "Patient",
      entityId: patient.id,
      ipAddress: ip,
    });

    const today = await this.clinicTimeService.today();
    return this.toDto(patient, today);
  }

  async findAll(): Promise<PatientDto[]> {
    const [patients, today] = await Promise.all([
      this.patientsRepository.findAllActive(),
      this.clinicTimeService.today(),
    ]);
    return patients.map((patient) => this.toDto(patient, today));
  }

  async findById(id: string): Promise<PatientDto> {
    const patient = await this.getExistingPatient(id);
    const today = await this.clinicTimeService.today();
    return this.toDto(patient, today);
  }

  /** B4: vincula un acudiente adicional. Si isPrimary, RN-08 desmarca al anterior en la misma transacción. */
  async linkTutor(
    patientId: string,
    input: LinkTutorInput,
    userId: string,
    ip: string,
  ): Promise<PatientDto> {
    await this.getExistingPatient(patientId);

    const tutor = await this.tutorsRepository.findById(input.tutorId);
    if (!tutor) {
      throw new NotFoundException("El acudiente seleccionado no existe.");
    }

    const result = await this.patientsRepository.linkTutor(
      patientId,
      input.tutorId,
      normalizeOptionalText(input.relationship),
      input.isPrimary,
    );
    if (result.outcome === "already_linked") {
      throw new ConflictException("Este acudiente ya está vinculado a esta mascota.");
    }

    await this.recordUpdate(patientId, userId, ip);
    const today = await this.clinicTimeService.today();
    return this.toDto(result.patient, today);
  }

  /** B4: marca un acudiente ya vinculado como principal; RN-08 desmarca al anterior. */
  async setPrimaryTutor(
    patientId: string,
    tutorId: string,
    userId: string,
    ip: string,
  ): Promise<PatientDto> {
    await this.getExistingPatient(patientId);

    const result = await this.patientsRepository.setPrimaryTutor(patientId, tutorId);
    if (result.outcome === "not_linked") {
      throw new NotFoundException("El acudiente no está vinculado a esta mascota.");
    }

    await this.recordUpdate(patientId, userId, ip);
    const today = await this.clinicTimeService.today();
    return this.toDto(result.patient, today);
  }

  /** B4, caso límite #3: no se puede desvincular al único acudiente de la mascota. */
  async unlinkTutor(
    patientId: string,
    tutorId: string,
    userId: string,
    ip: string,
  ): Promise<PatientDto> {
    await this.getExistingPatient(patientId);

    const result = await this.patientsRepository.unlinkTutor(patientId, tutorId);
    if (result.outcome === "not_linked") {
      throw new NotFoundException("El acudiente no está vinculado a esta mascota.");
    }
    if (result.outcome === "last_tutor") {
      throw new UnprocessableEntityException(
        "No se puede desvincular al único acudiente de esta mascota.",
      );
    }

    await this.recordUpdate(patientId, userId, ip);
    const today = await this.clinicTimeService.today();
    return this.toDto(result.patient, today);
  }

  private async getExistingPatient(id: string): Promise<PatientWithRelations> {
    const patient = await this.patientsRepository.findById(id);
    if (!patient) {
      throw new NotFoundException("La mascota no existe.");
    }
    return patient;
  }

  private async recordUpdate(patientId: string, userId: string, ip: string): Promise<void> {
    await this.auditService.record({
      userId,
      action: "UPDATE",
      entityName: "Patient",
      entityId: patientId,
      ipAddress: ip,
    });
  }

  private toDto(patient: PatientWithRelations, today: DateParts): PatientDto {
    return {
      id: patient.id,
      name: patient.name,
      species: patient.species,
      speciesOther: patient.speciesOther,
      breedId: patient.breedId,
      breedName: patient.breed?.name ?? null,
      breedOther: patient.breedOther,
      sex: patient.sex,
      isNeutered: patient.isNeutered,
      birthDate: patient.birthDate ? patient.birthDate.toISOString() : null,
      birthDateIsApprox: patient.birthDateIsApprox,
      ageLabel: patient.birthDate
        ? formatAgeLabel(getDatePartsUTC(patient.birthDate), today)
        : null,
      color: patient.color,
      microchip: patient.microchip,
      isDeceased: patient.isDeceased,
      isActive: patient.isActive,
      tutors: patient.tutors.map((link) => ({
        tutorId: link.tutorId,
        tutorName: `${link.tutor.firstName} ${link.tutor.lastName}`,
        tutorPhone: link.tutor.phone,
        isPrimary: link.isPrimary,
        relationship: link.relationship,
      })),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };
  }
}
