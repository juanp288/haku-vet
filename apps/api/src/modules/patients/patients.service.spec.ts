import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatePatientInput } from "@vetclinic/contracts";
import type { Breed, Patient, Tutor } from "@vetclinic/db";
import type { AuditService } from "../../common/audit/audit.service";
import type { ClinicTimeService } from "../../common/clinic-time/clinic-time.service";
import type { BreedsRepository } from "../breeds/breeds.repository";
import type { TutorsRepository } from "../tutors/tutors.repository";
import { PatientsService } from "./patients.service";
import type { PatientsRepository, PatientWithRelations } from "./patients.repository";

const USER_ID = "user_1";
const IP = "192.168.1.10";
const TUTOR_ID = "tutor_1";
const TODAY = { year: 2026, month: 8, day: 5 };

function buildInput(overrides: Partial<CreatePatientInput> = {}): CreatePatientInput {
  return {
    name: "Luna",
    species: "CANINO",
    sex: "HEMBRA",
    isNeutered: false,
    birthDateIsApprox: false,
    tutorId: TUTOR_ID,
    ...overrides,
  };
}

function buildTutor(overrides: Partial<Tutor> = {}): Tutor {
  return {
    id: TUTOR_ID,
    documentType: "CC",
    documentNumber: "52334981",
    firstName: "María Fernanda",
    lastName: "Núñez Rojas",
    phone: "+573006542211",
    phoneAlt: null,
    email: null,
    address: null,
    city: null,
    notes: null,
    dataConsent: true,
    dataConsentAt: new Date("2026-07-28T00:00:00.000Z"),
    isActive: true,
    createdAt: new Date("2026-07-28T00:00:00.000Z"),
    updatedAt: new Date("2026-07-28T00:00:00.000Z"),
    ...overrides,
  };
}

function buildBreed(overrides: Partial<Breed> = {}): Breed {
  return { id: "breed_1", name: "Labrador", species: "CANINO", isActive: true, ...overrides };
}

function buildPatientWithRelations(
  overrides: Partial<PatientWithRelations> = {},
): PatientWithRelations {
  const base: Patient = {
    id: "patient_1",
    name: "Luna",
    species: "CANINO",
    speciesOther: null,
    breedId: null,
    breedOther: null,
    sex: "HEMBRA",
    isNeutered: false,
    birthDate: null,
    birthDateIsApprox: false,
    color: null,
    microchip: null,
    photoPath: null,
    allergies: null,
    chronicConditions: null,
    clinicalAlert: null,
    isDeceased: false,
    deceasedAt: null,
    isActive: true,
    createdAt: new Date("2026-08-05T00:00:00.000Z"),
    updatedAt: new Date("2026-08-05T00:00:00.000Z"),
  };
  return {
    ...base,
    breed: null,
    tutors: [
      {
        id: "pt_1",
        patientId: base.id,
        tutorId: TUTOR_ID,
        isPrimary: true,
        relationship: null,
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
        tutor: { firstName: "María Fernanda", lastName: "Núñez Rojas" },
      },
    ],
    ...overrides,
  };
}

describe("PatientsService", () => {
  let patientsRepository: {
    findByMicrochip: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findAllActive: ReturnType<typeof vi.fn>;
  };
  let tutorsRepository: { findById: ReturnType<typeof vi.fn> };
  let breedsRepository: { findById: ReturnType<typeof vi.fn> };
  let clinicTimeService: { today: ReturnType<typeof vi.fn> };
  let audit: { record: ReturnType<typeof vi.fn> };
  let service: PatientsService;

  beforeEach(() => {
    patientsRepository = {
      findByMicrochip: vi.fn(),
      create: vi.fn(),
      findAllActive: vi.fn(),
    };
    tutorsRepository = { findById: vi.fn().mockResolvedValue(buildTutor()) };
    breedsRepository = { findById: vi.fn() };
    clinicTimeService = { today: vi.fn().mockResolvedValue(TODAY) };
    audit = { record: vi.fn() };
    service = new PatientsService(
      patientsRepository as unknown as PatientsRepository,
      tutorsRepository as unknown as TutorsRepository,
      breedsRepository as unknown as BreedsRepository,
      clinicTimeService as unknown as ClinicTimeService,
      audit as unknown as AuditService,
    );
  });

  describe("create", () => {
    it("crea la mascota vinculada al acudiente principal, calcula la edad y audita", async () => {
      patientsRepository.create.mockResolvedValue(
        buildPatientWithRelations({ birthDate: new Date("2023-06-10T00:00:00.000Z") }),
      );

      const result = await service.create(
        buildInput({ birthDate: "2023-06-10" }),
        USER_ID,
        IP,
      );

      expect(result.id).toBe("patient_1");
      expect(result.primaryTutorId).toBe(TUTOR_ID);
      expect(result.primaryTutorName).toBe("María Fernanda Núñez Rojas");
      expect(result.ageLabel).toBe("3 años 1 mes");
      expect(patientsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Luna", microchip: null }),
        TUTOR_ID,
        null,
      );
      expect(audit.record).toHaveBeenCalledWith({
        userId: USER_ID,
        action: "CREATE",
        entityName: "Patient",
        entityId: "patient_1",
        ipAddress: IP,
      });
    });

    it("rechaza si el acudiente no existe", async () => {
      tutorsRepository.findById.mockResolvedValue(null);

      await expect(service.create(buildInput(), USER_ID, IP)).rejects.toThrow(
        NotFoundException,
      );
      expect(patientsRepository.create).not.toHaveBeenCalled();
    });

    it("rechaza una raza que no corresponde a la especie indicada", async () => {
      breedsRepository.findById.mockResolvedValue(buildBreed({ species: "FELINO" }));

      await expect(
        service.create(buildInput({ species: "CANINO", breedId: "breed_1" }), USER_ID, IP),
      ).rejects.toThrow(BadRequestException);
      expect(patientsRepository.create).not.toHaveBeenCalled();
    });

    it("rechaza un microchip ya registrado con el id de la mascota existente", async () => {
      patientsRepository.findByMicrochip.mockResolvedValue(
        buildPatientWithRelations({ id: "patient_existente" }),
      );

      await expect(
        service.create(buildInput({ microchip: "985141000123456" }), USER_ID, IP),
      ).rejects.toThrow(ConflictException);

      try {
        await service.create(buildInput({ microchip: "985141000123456" }), USER_ID, IP);
        expect.fail("debería haber lanzado ConflictException");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getResponse()).toMatchObject({
          details: { existingPatientId: "patient_existente" },
        });
      }
      expect(patientsRepository.create).not.toHaveBeenCalled();
    });

    it("trata un microchip en blanco como ausente, sin validar unicidad", async () => {
      patientsRepository.create.mockResolvedValue(buildPatientWithRelations());

      await service.create(buildInput({ microchip: "   " }), USER_ID, IP);

      expect(patientsRepository.findByMicrochip).not.toHaveBeenCalled();
      expect(patientsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ microchip: null }),
        TUTOR_ID,
        null,
      );
    });

    it("descarta breedOther cuando sí se envía un breedId válido", async () => {
      breedsRepository.findById.mockResolvedValue(buildBreed());
      patientsRepository.create.mockResolvedValue(buildPatientWithRelations());

      await service.create(
        buildInput({ breedId: "breed_1", breedOther: "Mestizo" }),
        USER_ID,
        IP,
      );

      expect(patientsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ breedId: "breed_1", breedOther: null }),
        TUTOR_ID,
        null,
      );
    });

    it("sin fecha de nacimiento no calcula edad", async () => {
      patientsRepository.create.mockResolvedValue(buildPatientWithRelations({ birthDate: null }));

      const result = await service.create(buildInput(), USER_ID, IP);

      expect(result.ageLabel).toBeNull();
      expect(result.birthDate).toBeNull();
    });
  });

  describe("findAll", () => {
    it("devuelve las mascotas activas mapeadas con la misma fecha de hoy", async () => {
      patientsRepository.findAllActive.mockResolvedValue([buildPatientWithRelations()]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]?.primaryTutorName).toBe("María Fernanda Núñez Rojas");
      expect(clinicTimeService.today).toHaveBeenCalledTimes(1);
    });
  });
});
