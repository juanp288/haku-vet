import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateAppointmentInput } from "@vetclinic/contracts";
import type { AuditService } from "../../common/audit/audit.service";
import type { ClinicScheduleSettings, ClinicTimeService } from "../../common/clinic-time/clinic-time.service";
import type { PatientsRepository } from "../patients/patients.repository";
import { AppointmentsService } from "./appointments.service";
import type { ActiveVet, AppointmentRow, AppointmentsRepository } from "./appointments.repository";

const USER_ID = "user_1";
const IP = "192.168.1.10";

const SETTINGS: ClinicScheduleSettings = {
  timezone: "America/Bogota",
  openingHour: 8,
  closingHour: 18,
  slotMinutes: 30,
  workingDays: [1, 2, 3, 4, 5, 6],
};

function buildVet(overrides: Partial<ActiveVet> = {}): ActiveVet {
  return { id: "vet_1", fullName: "Dra. Camila Torres", color: "#1B8DE0", ...overrides };
}

function buildAppointmentRow(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
  return {
    id: "appt_1",
    patientId: "patient_1",
    vetId: "vet_1",
    createdById: "user_1",
    startsAt: new Date("2026-08-06T13:00:00.000Z"),
    endsAt: new Date("2026-08-06T13:30:00.000Z"),
    type: "CONSULTA",
    status: "AGENDADA",
    reason: "Control de vacunación",
    notes: null,
    arrivedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    patient: {
      id: "patient_1",
      name: "Luna",
      species: "CANINO",
      tutors: [
        {
          tutor: { firstName: "María Fernanda", lastName: "Núñez Rojas" },
        },
      ],
    },
    ...overrides,
  } as AppointmentRow;
}

function buildCreateInput(overrides: Partial<CreateAppointmentInput> = {}): CreateAppointmentInput {
  return {
    patientId: "patient_1",
    vetId: "vet_1",
    // Jueves 2026-08-06, 10:00 hora de la clínica — dentro de horario y en el futuro.
    date: "2026-08-06",
    time: "10:00",
    durationMinutes: 30,
    type: "CONSULTA",
    reason: "Control de vacunación",
    ...overrides,
  };
}

describe("AppointmentsService", () => {
  let appointmentsRepository: {
    findActiveVets: ReturnType<typeof vi.fn>;
    findActiveVetById: ReturnType<typeof vi.fn>;
    findAppointmentsInRange: ReturnType<typeof vi.fn>;
    createAppointment: ReturnType<typeof vi.fn>;
  };
  let patientsRepository: { findById: ReturnType<typeof vi.fn> };
  let clinicTimeService: { today: ReturnType<typeof vi.fn>; getSettings: ReturnType<typeof vi.fn> };
  let audit: { record: ReturnType<typeof vi.fn> };
  let service: AppointmentsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));

    appointmentsRepository = {
      findActiveVets: vi.fn().mockResolvedValue([buildVet()]),
      findActiveVetById: vi.fn().mockResolvedValue(buildVet()),
      findAppointmentsInRange: vi.fn().mockResolvedValue([]),
      createAppointment: vi.fn().mockResolvedValue({ outcome: "ok", appointment: buildAppointmentRow() }),
    };
    patientsRepository = { findById: vi.fn().mockResolvedValue({ isDeceased: false }) };
    clinicTimeService = {
      today: vi.fn().mockResolvedValue({ year: 2026, month: 8, day: 6 }),
      getSettings: vi.fn().mockResolvedValue(SETTINGS),
    };
    audit = { record: vi.fn() };
    service = new AppointmentsService(
      appointmentsRepository as unknown as AppointmentsRepository,
      patientsRepository as unknown as PatientsRepository,
      clinicTimeService as unknown as ClinicTimeService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('RN-19: sin "date" en el query, resuelve "hoy" vía ClinicTimeService, no con el reloj del sistema', async () => {
    const result = await service.getAgenda({});

    expect(clinicTimeService.today).toHaveBeenCalledOnce();
    expect(result.date).toBe("2026-08-06");
  });

  it("con date explícito en el query, no llama a today()", async () => {
    const result = await service.getAgenda({ date: "2026-08-10" });

    expect(clinicTimeService.today).not.toHaveBeenCalled();
    expect(result.date).toBe("2026-08-10");
  });

  it("RN-19: calcula el rango [00:00, 24:00) del día como instantes UTC reales (América/Bogotá = UTC-5)", async () => {
    await service.getAgenda({ date: "2026-08-06" });

    expect(appointmentsRepository.findAppointmentsInRange).toHaveBeenCalledWith(
      new Date("2026-08-06T05:00:00.000Z"),
      new Date("2026-08-07T05:00:00.000Z"),
    );
  });

  it("cada veterinario activo aparece como columna incluso sin citas ese día", async () => {
    appointmentsRepository.findActiveVets.mockResolvedValue([
      buildVet({ id: "vet_1" }),
      buildVet({ id: "vet_2", fullName: "Dr. Andrés Rueda" }),
    ]);
    appointmentsRepository.findAppointmentsInRange.mockResolvedValue([]);

    const result = await service.getAgenda({ date: "2026-08-06" });

    expect(result.vets).toHaveLength(2);
    expect(result.vets.every((v) => v.appointments.length === 0)).toBe(true);
  });

  it("agrupa las citas bajo el veterinario correcto y mapea paciente/acudiente/motivo", async () => {
    appointmentsRepository.findAppointmentsInRange.mockResolvedValue([buildAppointmentRow()]);

    const result = await service.getAgenda({ date: "2026-08-06" });

    expect(result.vets[0]?.appointments).toHaveLength(1);
    expect(result.vets[0]?.appointments[0]).toMatchObject({
      id: "appt_1",
      reason: "Control de vacunación",
      patientName: "Luna",
      patientSpecies: "CANINO",
      tutorName: "María Fernanda Núñez Rojas",
      status: "AGENDADA",
      type: "CONSULTA",
      startTimeLabel: "08:00",
    });
  });

  it("mascota sin acudiente principal no revienta — cae a un guion", async () => {
    appointmentsRepository.findAppointmentsInRange.mockResolvedValue([
      buildAppointmentRow({ patient: { id: "patient_1", name: "Luna", species: "CANINO", tutors: [] } }),
    ]);

    const result = await service.getAgenda({ date: "2026-08-06" });

    expect(result.vets[0]?.appointments[0]?.tutorName).toBe("—");
  });

  it("isWorkingDay es true para un día laboral configurado", async () => {
    // 2026-08-06 es jueves (día 4), incluido en workingDays por defecto.
    const result = await service.getAgenda({ date: "2026-08-06" });
    expect(result.isWorkingDay).toBe(true);
  });

  it("isWorkingDay es false para un domingo cuando no está en workingDays", async () => {
    // 2026-08-09 es domingo (día 0), no incluido en [1,2,3,4,5,6].
    const result = await service.getAgenda({ date: "2026-08-09" });
    expect(result.isWorkingDay).toBe(false);
  });

  it("expone el horario configurado de la clínica en la respuesta", async () => {
    const result = await service.getAgenda({ date: "2026-08-06" });
    expect(result.openingHour).toBe(8);
    expect(result.closingHour).toBe(18);
    expect(result.slotMinutes).toBe(30);
  });

  describe("create", () => {
    it("agenda la cita cuando todo es válido y audita la creación", async () => {
      const result = await service.create(buildCreateInput(), USER_ID, "RECEPCION", IP);

      expect(result.id).toBe("appt_1");
      expect(appointmentsRepository.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "patient_1",
          vetId: "vet_1",
          createdById: USER_ID,
          reason: "Control de vacunación",
        }),
      );
      expect(audit.record).toHaveBeenCalledWith({
        userId: USER_ID,
        action: "CREATE",
        entityName: "Appointment",
        entityId: "appt_1",
        ipAddress: IP,
      });
    });

    it("rechaza si la mascota no existe", async () => {
      patientsRepository.findById.mockResolvedValue(null);

      await expect(service.create(buildCreateInput(), USER_ID, "RECEPCION", IP)).rejects.toThrow(
        NotFoundException,
      );
      expect(appointmentsRepository.createAppointment).not.toHaveBeenCalled();
    });

    it("rechaza si la mascota está marcada como fallecida", async () => {
      patientsRepository.findById.mockResolvedValue({ isDeceased: true });

      await expect(service.create(buildCreateInput(), USER_ID, "RECEPCION", IP)).rejects.toThrow(
        BadRequestException,
      );
      expect(appointmentsRepository.createAppointment).not.toHaveBeenCalled();
    });

    it("rechaza si el veterinario no existe o no está activo", async () => {
      appointmentsRepository.findActiveVetById.mockResolvedValue(null);

      await expect(service.create(buildCreateInput(), USER_ID, "RECEPCION", IP)).rejects.toThrow(
        NotFoundException,
      );
      expect(appointmentsRepository.createAppointment).not.toHaveBeenCalled();
    });

    it("RN-03: rechaza agendar en el pasado para RECEPCION", async () => {
      await expect(
        service.create(
          // Miércoles pasado, 10:00 local — en el pasado pero dentro de
          // horario, para aislar RN-03 de RN-02.
          buildCreateInput({ date: "2026-07-01", time: "10:00" }),
          USER_ID,
          "RECEPCION",
          IP,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(appointmentsRepository.createAppointment).not.toHaveBeenCalled();
    });

    it("RN-03: ADMIN sí puede registrar citas retroactivas", async () => {
      await service.create(
        buildCreateInput({ date: "2026-07-01", time: "10:00" }),
        USER_ID,
        "ADMIN",
        IP,
      );
      expect(appointmentsRepository.createAppointment).toHaveBeenCalled();
    });

    it("RN-02: rechaza fuera del horario configurado de la clínica", async () => {
      await expect(
        service.create(
          buildCreateInput({ date: "2026-08-06", time: "21:00" }),
          USER_ID,
          "RECEPCION",
          IP,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(appointmentsRepository.createAppointment).not.toHaveBeenCalled();
    });

    it("RN-02: rechaza en un día no configurado como laboral", async () => {
      // 2026-08-09 es domingo; 10:00 local, dentro de horario pero día no laboral.
      await expect(
        service.create(
          buildCreateInput({ date: "2026-08-09", time: "10:00" }),
          USER_ID,
          "RECEPCION",
          IP,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(appointmentsRepository.createAppointment).not.toHaveBeenCalled();
    });

    it("RN-02: URGENCIA se permite fuera del horario configurado", async () => {
      await service.create(
        buildCreateInput({ date: "2026-08-06", time: "21:00", type: "URGENCIA" }),
        USER_ID,
        "RECEPCION",
        IP,
      );
      expect(appointmentsRepository.createAppointment).toHaveBeenCalled();
    });

    it("RN-01, caso límite #1: dos recepcionistas agendan la misma franja → conflicto 409 con la cita existente", async () => {
      const conflicting = buildAppointmentRow({ id: "appt_existente" });
      appointmentsRepository.createAppointment.mockResolvedValue({
        outcome: "conflict",
        conflicting,
      });

      await expect(service.create(buildCreateInput(), USER_ID, "RECEPCION", IP)).rejects.toThrow(
        ConflictException,
      );

      try {
        await service.create(buildCreateInput(), USER_ID, "RECEPCION", IP);
        expect.fail("debería haber lanzado ConflictException");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const response = (error as ConflictException).getResponse() as {
          details: { conflictingAppointment: { id: string } };
        };
        expect(response.details.conflictingAppointment.id).toBe("appt_existente");
      }
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});
