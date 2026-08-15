import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateConsultationInput,
  UpdateConsultationDraftInput,
  UpdateVitalsInput,
} from "@vetclinic/contracts";
import { Prisma } from "@vetclinic/db";
import type { AuditService } from "../../common/audit/audit.service";
import type { AppointmentRow, AppointmentsRepository } from "../appointments/appointments.repository";
import type { PatientsRepository } from "../patients/patients.repository";
import { ConsultationsService } from "./consultations.service";
import type { ConsultationDetailRow, ConsultationsRepository } from "./consultations.repository";

const USER_ID = "vet_1";
const OTHER_USER_ID = "vet_2";
const ADMIN_ID = "admin_1";
const IP = "192.168.1.10";

function buildAppointment(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
  return {
    id: "appt_1",
    patientId: "patient_1",
    vetId: USER_ID,
    createdById: USER_ID,
    startsAt: new Date("2026-08-06T13:00:00.000Z"),
    endsAt: new Date("2026-08-06T13:30:00.000Z"),
    type: "CONSULTA",
    status: "EN_SALA",
    reason: "Control",
    notes: null,
    arrivedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    patient: { id: "patient_1", name: "Luna", species: "CANINO", tutors: [] },
    consultation: null,
    ...overrides,
  };
}

function buildConsultationRow(overrides: Partial<ConsultationDetailRow> = {}): ConsultationDetailRow {
  return {
    id: "consult_1",
    patientId: "patient_1",
    appointmentId: "appt_1",
    vetId: USER_ID,
    occurredAt: new Date("2026-08-06T13:05:00.000Z"),
    status: "BORRADOR",
    closedAt: null,
    reason: "Control de vacunación",
    subjective: null,
    objective: null,
    assessment: null,
    plan: null,
    diagnosis: null,
    treatment: null,
    prescription: null,
    weightKg: null,
    temperatureC: null,
    heartRate: null,
    respiratoryRate: null,
    bodyConditionScore: null,
    mucousMembranes: null,
    capillaryRefill: null,
    nextControlAt: null,
    createdAt: new Date("2026-08-06T13:05:00.000Z"),
    updatedAt: new Date("2026-08-06T13:05:00.000Z"),
    patient: { id: "patient_1", name: "Luna" },
    vet: { fullName: "Dra. Camila Torres" },
    ...overrides,
  };
}

function buildCreateInput(overrides: Partial<CreateConsultationInput> = {}): CreateConsultationInput {
  return {
    appointmentId: "appt_1",
    reason: "Control de vacunación",
    ...overrides,
  };
}

describe("ConsultationsService", () => {
  let consultationsRepository: {
    create: ReturnType<typeof vi.fn>;
    findVisibleById: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findLatestClosedWeight: ReturnType<typeof vi.fn>;
    updateDraft: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let appointmentsRepository: {
    findById: ReturnType<typeof vi.fn>;
    findActiveVetById: ReturnType<typeof vi.fn>;
  };
  let patientsRepository: { findById: ReturnType<typeof vi.fn> };
  let audit: { record: ReturnType<typeof vi.fn> };
  let service: ConsultationsService;

  beforeEach(() => {
    consultationsRepository = {
      create: vi.fn().mockResolvedValue(buildConsultationRow()),
      findVisibleById: vi.fn().mockResolvedValue(buildConsultationRow()),
      findById: vi.fn().mockResolvedValue(buildConsultationRow()),
      findLatestClosedWeight: vi.fn().mockResolvedValue(null),
      close: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({
            outcome: "ok",
            consultation: buildConsultationRow({
              status: "CERRADA",
              closedAt: new Date("2026-08-06T14:00:00.000Z"),
            }),
          }),
        ),
      updateDraft: vi
        .fn()
        .mockImplementation((id: string, data: Record<string, unknown>) =>
          Promise.resolve(
            buildConsultationRow({
              id,
              ...data,
              ...(typeof data["weightKg"] === "number"
                ? { weightKg: new Prisma.Decimal(data["weightKg"]) }
                : {}),
              ...(typeof data["temperatureC"] === "number"
                ? { temperatureC: new Prisma.Decimal(data["temperatureC"]) }
                : {}),
              ...(typeof data["capillaryRefill"] === "number"
                ? { capillaryRefill: new Prisma.Decimal(data["capillaryRefill"]) }
                : {}),
            }),
          ),
        ),
    };
    appointmentsRepository = {
      findById: vi.fn().mockResolvedValue(buildAppointment()),
      findActiveVetById: vi
        .fn()
        .mockResolvedValue({ id: USER_ID, fullName: "Dra. Camila Torres", color: null }),
    };
    patientsRepository = {
      findById: vi.fn().mockResolvedValue({ id: "patient_1", isDeceased: false }),
    };
    audit = { record: vi.fn() };
    service = new ConsultationsService(
      consultationsRepository as unknown as ConsultationsRepository,
      appointmentsRepository as unknown as AppointmentsRepository,
      patientsRepository as unknown as PatientsRepository,
      audit as unknown as AuditService,
    );
  });

  describe("create", () => {
    it("crea desde una cita EN_SALA, precargando paciente y veterinario, y audita", async () => {
      const result = await service.create(buildCreateInput(), USER_ID, IP);

      expect(result.id).toBe("consult_1");
      expect(consultationsRepository.create).toHaveBeenCalledWith({
        patientId: "patient_1",
        vetId: USER_ID,
        appointmentId: "appt_1",
        reason: "Control de vacunación",
      });
      expect(audit.record).toHaveBeenCalledWith({
        userId: USER_ID,
        action: "CREATE",
        entityName: "Consultation",
        entityId: "consult_1",
        ipAddress: IP,
      });
    });

    it("crea desde una cita EN_ATENCION también", async () => {
      appointmentsRepository.findById.mockResolvedValue(buildAppointment({ status: "EN_ATENCION" }));
      await service.create(buildCreateInput(), USER_ID, IP);
      expect(consultationsRepository.create).toHaveBeenCalled();
    });

    it("rechaza crear desde una cita en un estado distinto de EN_SALA/EN_ATENCION", async () => {
      appointmentsRepository.findById.mockResolvedValue(buildAppointment({ status: "AGENDADA" }));

      await expect(service.create(buildCreateInput(), USER_ID, IP)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(consultationsRepository.create).not.toHaveBeenCalled();
    });

    it("rechaza si la cita no existe", async () => {
      appointmentsRepository.findById.mockResolvedValue(null);

      await expect(service.create(buildCreateInput(), USER_ID, IP)).rejects.toThrow(NotFoundException);
    });

    it("rechaza si la cita ya tiene una consulta asociada", async () => {
      appointmentsRepository.findById.mockResolvedValue(
        buildAppointment({ consultation: { id: "existing_consult", status: "BORRADOR" } }),
      );

      await expect(service.create(buildCreateInput(), USER_ID, IP)).rejects.toThrow(ConflictException);
      expect(consultationsRepository.create).not.toHaveBeenCalled();
    });

    it("crea standalone (urgencia) con patientId + vetId, sin cita", async () => {
      const result = await service.create(
        buildCreateInput({ appointmentId: undefined, patientId: "patient_1", vetId: USER_ID }),
        USER_ID,
        IP,
      );

      expect(result.id).toBe("consult_1");
      expect(consultationsRepository.create).toHaveBeenCalledWith({
        patientId: "patient_1",
        vetId: USER_ID,
        appointmentId: null,
        reason: "Control de vacunación",
      });
    });

    it("rechaza standalone si la mascota no existe", async () => {
      patientsRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(
          buildCreateInput({ appointmentId: undefined, patientId: "patient_1", vetId: USER_ID }),
          USER_ID,
          IP,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("rechaza standalone si la mascota está fallecida", async () => {
      patientsRepository.findById.mockResolvedValue({ id: "patient_1", isDeceased: true });

      await expect(
        service.create(
          buildCreateInput({ appointmentId: undefined, patientId: "patient_1", vetId: USER_ID }),
          USER_ID,
          IP,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rechaza standalone si el veterinario no existe o no está activo", async () => {
      appointmentsRepository.findActiveVetById.mockResolvedValue(null);

      await expect(
        service.create(
          buildCreateInput({ appointmentId: undefined, patientId: "patient_1", vetId: USER_ID }),
          USER_ID,
          IP,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findById (RN-07 / RN-18)", () => {
    it("el autor ve su propio borrador completo", async () => {
      const result = await service.findById("consult_1", { sub: USER_ID, role: "VETERINARIO" });
      expect(result.reason).toBe("Control de vacunación");
    });

    it("ADMIN ve cualquier borrador completo", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(buildConsultationRow());
      const result = await service.findById("consult_1", { sub: ADMIN_ID, role: "ADMIN" });
      expect(result.reason).toBe("Control de vacunación");
    });

    it("otro VETERINARIO no ve el borrador ajeno (repository ya lo filtra a null → 404)", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(null);

      await expect(
        service.findById("consult_1", { sub: OTHER_USER_ID, role: "VETERINARIO" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("AUXILIAR ve una consulta CERRADA redactada a solo signos vitales", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(
        buildConsultationRow({
          status: "CERRADA",
          closedAt: new Date("2026-08-06T14:00:00.000Z"),
          weightKg: new Prisma.Decimal("22.6"),
          temperatureC: new Prisma.Decimal("38.4"),
        }),
      );

      const result = await service.findById("consult_1", { sub: "aux_1", role: "AUXILIAR" });

      expect(result.reason).toBeNull();
      expect(result.subjective).toBeNull();
      expect(result.diagnosis).toBeNull();
      expect(result.weightKg).toBe(22.6);
      expect(result.temperatureC).toBe(38.4);
    });

    it("404 si la consulta no existe", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(null);
      await expect(
        service.findById("consult_x", { sub: USER_ID, role: "VETERINARIO" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateDraft (D1 autoguardado, RN-05)", () => {
    function buildUpdateInput(
      overrides: Partial<UpdateConsultationDraftInput> = {},
    ): UpdateConsultationDraftInput {
      return { subjective: "El paciente llega alerta.", ...overrides };
    }

    it("guarda cambios parciales del borrador y audita", async () => {
      const result = await service.updateDraft(
        "consult_1",
        buildUpdateInput(),
        { sub: USER_ID, role: "VETERINARIO" },
        IP,
      );

      expect(consultationsRepository.updateDraft).toHaveBeenCalledWith(
        "consult_1",
        expect.objectContaining({ subjective: "El paciente llega alerta." }),
      );
      expect(result.id).toBe("consult_1");
      expect(audit.record).toHaveBeenCalledWith({
        userId: USER_ID,
        action: "UPDATE",
        entityName: "Consultation",
        entityId: "consult_1",
        ipAddress: IP,
      });
    });

    it("RN-05: rechaza si la consulta ya está CERRADA", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(
        buildConsultationRow({ status: "CERRADA" }),
      );

      await expect(
        service.updateDraft("consult_1", buildUpdateInput(), { sub: USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(consultationsRepository.updateDraft).not.toHaveBeenCalled();
    });

    it("404 si la consulta no existe o no es visible (borrador ajeno)", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(null);

      await expect(
        service.updateDraft("consult_1", buildUpdateInput(), { sub: OTHER_USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(NotFoundException);
    });

    it("409 si se cerró entre la lectura y la escritura (carrera)", async () => {
      consultationsRepository.updateDraft.mockResolvedValue(null);

      await expect(
        service.updateDraft("consult_1", buildUpdateInput(), { sub: USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(ConflictException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it("solo envía al repository los campos presentes en el input (autoguardado parcial)", async () => {
      await service.updateDraft(
        "consult_1",
        { weightKg: 22.6 },
        { sub: USER_ID, role: "VETERINARIO" },
        IP,
      );

      const [, dataArg] = consultationsRepository.updateDraft.mock.calls[0] as [string, unknown];
      expect(dataArg).toEqual({ weightKg: 22.6 });
    });

    it("nextControlAt se convierte de AAAA-MM-DD a Date; null limpia el campo", async () => {
      await service.updateDraft(
        "consult_1",
        { nextControlAt: "2026-09-01" },
        { sub: USER_ID, role: "VETERINARIO" },
        IP,
      );
      expect(consultationsRepository.updateDraft).toHaveBeenCalledWith("consult_1", {
        nextControlAt: new Date("2026-09-01T00:00:00.000Z"),
      });

      await service.updateDraft(
        "consult_1",
        { nextControlAt: null },
        { sub: USER_ID, role: "VETERINARIO" },
        IP,
      );
      expect(consultationsRepository.updateDraft).toHaveBeenCalledWith("consult_1", {
        nextControlAt: null,
      });
    });
  });

  describe("updateVitals (D2)", () => {
    function buildVitalsInput(overrides: Partial<UpdateVitalsInput> = {}): UpdateVitalsInput {
      return { weightKg: 22.6, ...overrides };
    }

    it("AUXILIAR registra signos vitales en un borrador que NO es suyo (sin chequeo de autoría, a diferencia de updateDraft)", async () => {
      consultationsRepository.findById.mockResolvedValue(
        buildConsultationRow({ vetId: OTHER_USER_ID }),
      );

      const result = await service.updateVitals(
        "consult_1",
        buildVitalsInput(),
        { sub: "aux_1", role: "AUXILIAR" },
        IP,
      );

      expect(consultationsRepository.updateDraft).toHaveBeenCalledWith("consult_1", {
        weightKg: 22.6,
      });
      expect(result.id).toBe("consult_1");
      expect(audit.record).toHaveBeenCalledWith({
        userId: "aux_1",
        action: "UPDATE",
        entityName: "Consultation",
        entityId: "consult_1",
        ipAddress: IP,
      });
    });

    it("la respuesta para AUXILIAR queda redactada a solo signos vitales", async () => {
      const result = await service.updateVitals(
        "consult_1",
        buildVitalsInput(),
        { sub: "aux_1", role: "AUXILIAR" },
        IP,
      );
      expect(result.reason).toBeNull();
      expect(result.subjective).toBeNull();
    });

    it("VETERINARIO también puede usar este endpoint (RN-18 lo permite)", async () => {
      await service.updateVitals(
        "consult_1",
        buildVitalsInput(),
        { sub: USER_ID, role: "VETERINARIO" },
        IP,
      );
      expect(consultationsRepository.updateDraft).toHaveBeenCalled();
    });

    it("RN-05: rechaza si la consulta ya está CERRADA", async () => {
      consultationsRepository.findById.mockResolvedValue(buildConsultationRow({ status: "CERRADA" }));

      await expect(
        service.updateVitals("consult_1", buildVitalsInput(), { sub: "aux_1", role: "AUXILIAR" }, IP),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(consultationsRepository.updateDraft).not.toHaveBeenCalled();
    });

    it("404 si la consulta no existe", async () => {
      consultationsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateVitals("consult_x", buildVitalsInput(), { sub: "aux_1", role: "AUXILIAR" }, IP),
      ).rejects.toThrow(NotFoundException);
    });

    it("409 si se cerró entre la lectura y la escritura (carrera)", async () => {
      consultationsRepository.updateDraft.mockResolvedValue(null);

      await expect(
        service.updateVitals("consult_1", buildVitalsInput(), { sub: "aux_1", role: "AUXILIAR" }, IP),
      ).rejects.toThrow(ConflictException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it("solo envía al repository los campos de signos vitales presentes (nunca reason/SOAP, ni siquiera si vinieran en el input)", async () => {
      await service.updateVitals(
        "consult_1",
        { heartRate: 110, respiratoryRate: 24 },
        { sub: "aux_1", role: "AUXILIAR" },
        IP,
      );
      expect(consultationsRepository.updateDraft).toHaveBeenCalledWith("consult_1", {
        heartRate: 110,
        respiratoryRate: 24,
      });
    });

    it("D2: no bloquea valores fuera del rango fisiológico de referencia (advierte, no rechaza)", async () => {
      // 400 lpm está fuera de 20-300, pero es una medición real posible en una urgencia — no debe lanzar.
      await expect(
        service.updateVitals(
          "consult_1",
          { heartRate: 400 },
          { sub: "aux_1", role: "AUXILIAR" },
          IP,
        ),
      ).resolves.toBeDefined();
    });
  });

  describe("previousWeightKg (D2)", () => {
    it("incluye el último peso de una consulta CERRADA anterior del mismo paciente", async () => {
      consultationsRepository.findLatestClosedWeight.mockResolvedValue(new Prisma.Decimal("21.0"));

      const result = await service.findById("consult_1", { sub: USER_ID, role: "VETERINARIO" });

      expect(consultationsRepository.findLatestClosedWeight).toHaveBeenCalledWith(
        "patient_1",
        "consult_1",
      );
      expect(result.previousWeightKg).toBe(21.0);
    });

    it("null cuando el paciente no tiene consultas CERRADAS previas con peso", async () => {
      consultationsRepository.findLatestClosedWeight.mockResolvedValue(null);

      const result = await service.findById("consult_1", { sub: USER_ID, role: "VETERINARIO" });

      expect(result.previousWeightKg).toBeNull();
    });
  });

  describe("close (D3, RN-06)", () => {
    function buildCloseableRow(overrides: Partial<ConsultationDetailRow> = {}) {
      return buildConsultationRow({
        reason: "Control de vacunación",
        objective: "FC 110, mucosas rosadas.",
        assessment: "Paciente estable.",
        ...overrides,
      });
    }

    it("cierra cuando reason/objective/assessment están diligenciados", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(buildCloseableRow());

      const result = await service.close("consult_1", { sub: USER_ID, role: "VETERINARIO" }, IP);

      expect(consultationsRepository.close).toHaveBeenCalledWith("consult_1", USER_ID, IP);
      expect(result.status).toBe("CERRADA");
    });

    it("RN-06: rechaza si falta reason", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(
        buildCloseableRow({ reason: "" }),
      );

      await expect(
        service.close("consult_1", { sub: USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(consultationsRepository.close).not.toHaveBeenCalled();
    });

    it("RN-06: rechaza si falta objective", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(
        buildCloseableRow({ objective: null }),
      );

      await expect(
        service.close("consult_1", { sub: USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(consultationsRepository.close).not.toHaveBeenCalled();
    });

    it("RN-06: rechaza si falta assessment", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(
        buildCloseableRow({ assessment: "   " }),
      );

      await expect(
        service.close("consult_1", { sub: USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(consultationsRepository.close).not.toHaveBeenCalled();
    });

    it("RN-05: rechaza si ya está cerrada", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(
        buildCloseableRow({ status: "CERRADA" }),
      );

      await expect(
        service.close("consult_1", { sub: USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(consultationsRepository.close).not.toHaveBeenCalled();
    });

    it("404 si la consulta no existe o no es visible (borrador ajeno)", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(null);

      await expect(
        service.close("consult_1", { sub: OTHER_USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(NotFoundException);
    });

    it("409 si se cerró entre la lectura y el cierre (carrera)", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(buildCloseableRow());
      consultationsRepository.close.mockResolvedValue({ outcome: "conflict" });

      await expect(
        service.close("consult_1", { sub: USER_ID, role: "VETERINARIO" }, IP),
      ).rejects.toThrow(ConflictException);
    });

    it("ADMIN puede cerrar un borrador ajeno", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(buildCloseableRow());

      const result = await service.close("consult_1", { sub: ADMIN_ID, role: "ADMIN" }, IP);
      expect(result.status).toBe("CERRADA");
    });

    it("la respuesta tras cerrar no está redactada (solo VETERINARIO/ADMIN llegan aquí)", async () => {
      consultationsRepository.findVisibleById.mockResolvedValue(buildCloseableRow());

      const result = await service.close("consult_1", { sub: USER_ID, role: "VETERINARIO" }, IP);
      expect(result.reason).not.toBeNull();
    });
  });
});
