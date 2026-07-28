import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateTutorInput } from "@vetclinic/contracts";
import type { Tutor } from "@vetclinic/db";
import type { AuditService } from "../../common/audit/audit.service";
import { TutorsService } from "./tutors.service";
import type { TutorsRepository } from "./tutors.repository";

const USER_ID = "user_1";
const IP = "192.168.1.10";

function buildInput(overrides: Partial<CreateTutorInput> = {}): CreateTutorInput {
  return {
    documentType: "CC",
    documentNumber: "52334981",
    firstName: "María Fernanda",
    lastName: "Núñez Rojas",
    phone: "+57 300 654 2211",
    dataConsent: true,
    ...overrides,
  };
}

function buildTutor(overrides: Partial<Tutor> = {}): Tutor {
  return {
    id: "tutor_1",
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

describe("TutorsService", () => {
  let repository: {
    findByDocument: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findAllActive: ReturnType<typeof vi.fn>;
  };
  let audit: { record: ReturnType<typeof vi.fn> };
  let service: TutorsService;

  beforeEach(() => {
    repository = {
      findByDocument: vi.fn(),
      create: vi.fn(),
      findAllActive: vi.fn(),
    };
    audit = { record: vi.fn() };
    service = new TutorsService(
      repository as unknown as TutorsRepository,
      audit as unknown as AuditService,
    );
  });

  describe("create", () => {
    it("crea el acudiente, sella dataConsentAt y registra auditoría", async () => {
      repository.findByDocument.mockResolvedValue(null);
      repository.create.mockResolvedValue(buildTutor());

      const result = await service.create(buildInput(), USER_ID, IP);

      expect(result.id).toBe("tutor_1");
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentNumber: "52334981",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any() es `any` por diseño de Vitest
          dataConsentAt: expect.any(Date),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith({
        userId: USER_ID,
        action: "CREATE",
        entityName: "Tutor",
        entityId: "tutor_1",
        ipAddress: IP,
      });
    });

    it("normaliza el teléfono a solo dígitos y '+' antes de guardar", async () => {
      repository.findByDocument.mockResolvedValue(null);
      repository.create.mockResolvedValue(buildTutor());

      await service.create(buildInput({ phone: "+57 (300) 654-2211" }), USER_ID, IP);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "+573006542211" }),
      );
    });

    it("trata el correo vacío como ausente", async () => {
      repository.findByDocument.mockResolvedValue(null);
      repository.create.mockResolvedValue(buildTutor());

      await service.create(buildInput({ email: "" }), USER_ID, IP);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: null }),
      );
    });

    it("rechaza un documento duplicado con el id del registro existente (RN-09)", async () => {
      repository.findByDocument.mockResolvedValue(buildTutor({ id: "tutor_existente" }));

      await expect(service.create(buildInput(), USER_ID, IP)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();

      try {
        await service.create(buildInput(), USER_ID, IP);
        expect.fail("debería haber lanzado ConflictException");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const response = (error as ConflictException).getResponse();
        expect(response).toMatchObject({
          details: { existingTutorId: "tutor_existente" },
        });
      }
    });
  });

  describe("findAll", () => {
    it("devuelve los acudientes activos mapeados", async () => {
      repository.findAllActive.mockResolvedValue([buildTutor()]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("tutor_1");
    });
  });
});
