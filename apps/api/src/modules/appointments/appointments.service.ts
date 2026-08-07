import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { AgendaAppointment, AgendaDay, CreateAppointmentInput, GetAgendaQuery } from "@vetclinic/contracts";
import type { Role } from "@vetclinic/db";
import { AuditService } from "../../common/audit/audit.service";
import { ClinicTimeService } from "../../common/clinic-time/clinic-time.service";
import {
  formatDateParts,
  formatTimeInTimezone,
  getDayOfWeekUTC,
  getDayRangeInTimezone,
  getUtcInstantForZonedTime,
  parseDateParts,
  parseTimeLabelToMinutes,
} from "../../common/clinic-time/clinic-time.util";
import { PatientsRepository } from "../patients/patients.repository";
import { AppointmentsRepository, type AppointmentRow } from "./appointments.repository";

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly patientsRepository: PatientsRepository,
    private readonly clinicTimeService: ClinicTimeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * C1: agenda del día. RN-19 — si no viene `date` en el query, "hoy" se
   * resuelve con ClinicSettings.timezone (nunca con el reloj del navegador
   * ni del servidor), y el rango horario que se consulta también se
   * calcula convirtiendo la hora de pared de la clínica a instantes UTC.
   */
  async getAgenda(query: GetAgendaQuery): Promise<AgendaDay> {
    const settings = await this.clinicTimeService.getSettings();
    const dateParts = query.date ? parseDateParts(query.date) : await this.clinicTimeService.today();
    const { start, end } = getDayRangeInTimezone(dateParts, settings.timezone);

    const [vets, appointments] = await Promise.all([
      this.appointmentsRepository.findActiveVets(),
      this.appointmentsRepository.findAppointmentsInRange(start, end),
    ]);

    const appointmentsByVet = new Map<string, AgendaAppointment[]>();
    for (const appointment of appointments) {
      const list = appointmentsByVet.get(appointment.vetId) ?? [];
      list.push(this.toAgendaAppointment(appointment, settings.timezone));
      appointmentsByVet.set(appointment.vetId, list);
    }

    return {
      date: formatDateParts(dateParts),
      isWorkingDay: settings.workingDays.includes(getDayOfWeekUTC(dateParts)),
      openingHour: settings.openingHour,
      closingHour: settings.closingHour,
      slotMinutes: settings.slotMinutes,
      vets: vets.map((vet) => ({
        vetId: vet.id,
        vetName: vet.fullName,
        color: vet.color,
        appointments: appointmentsByVet.get(vet.id) ?? [],
      })),
    };
  }

  /** C2: agendar una cita. RN-01/02/03 se validan aquí; el solapamiento se resuelve transaccionalmente en el repository. */
  async create(
    input: CreateAppointmentInput,
    userId: string,
    userRole: Role,
    ip: string,
  ): Promise<AgendaAppointment> {
    const patient = await this.patientsRepository.findById(input.patientId);
    if (!patient) {
      throw new NotFoundException("La mascota no existe.");
    }
    if (patient.isDeceased) {
      throw new BadRequestException(
        "No se puede agendar una cita para una mascota marcada como fallecida.",
      );
    }

    const vet = await this.appointmentsRepository.findActiveVetById(input.vetId);
    if (!vet) {
      throw new NotFoundException("El veterinario seleccionado no existe.");
    }

    const dateParts = parseDateParts(input.date);
    const [hour, minute] = input.time.split(":").map(Number);
    const settings = await this.clinicTimeService.getSettings();

    // RN-19: `date`+`time` ya vienen en hora de pared de la clínica — el
    // backend es el único que convierte a instante UTC real.
    const startsAt = getUtcInstantForZonedTime(dateParts, hour ?? 0, minute ?? 0, settings.timezone);
    const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);

    // RN-03: no se agenda en el pasado, salvo ADMIN (digitaliza el cuaderno retroactivamente).
    if (startsAt.getTime() < Date.now() && userRole !== "ADMIN") {
      throw new BadRequestException("No se puede agendar una cita en el pasado.");
    }

    // RN-02: dentro del horario configurado y en día laboral, salvo URGENCIA.
    // `date`/`time` ya son locales, así que esto es aritmética directa —
    // sin volver a convertir el instante UTC de vuelta a hora local.
    if (input.type !== "URGENCIA") {
      const startMinutes = parseTimeLabelToMinutes(input.time);
      const endMinutes = startMinutes + input.durationMinutes;
      const isWorkingDay = settings.workingDays.includes(getDayOfWeekUTC(dateParts));
      const withinHours =
        startMinutes >= settings.openingHour * 60 && endMinutes <= settings.closingHour * 60;

      if (!isWorkingDay || !withinHours) {
        throw new BadRequestException(
          "La cita debe quedar dentro del horario configurado de la clínica.",
        );
      }
    }

    const result = await this.appointmentsRepository.createAppointment({
      patientId: input.patientId,
      vetId: input.vetId,
      createdById: userId,
      startsAt,
      endsAt,
      type: input.type,
      reason: input.reason.trim(),
      notes: input.notes?.trim() || null,
    });

    if (result.outcome === "conflict") {
      throw new ConflictException({
        statusCode: 409,
        message: "El veterinario ya tiene una cita agendada en ese horario.",
        details: {
          conflictingAppointment: this.toAgendaAppointment(result.conflicting, settings.timezone),
        },
      });
    }

    await this.auditService.record({
      userId,
      action: "CREATE",
      entityName: "Appointment",
      entityId: result.appointment.id,
      ipAddress: ip,
    });

    return this.toAgendaAppointment(result.appointment, settings.timezone);
  }

  private toAgendaAppointment(row: AppointmentRow, timezone: string): AgendaAppointment {
    const primaryTutor = row.patient.tutors[0];
    return {
      id: row.id,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      startTimeLabel: formatTimeInTimezone(row.startsAt, timezone),
      type: row.type,
      status: row.status,
      reason: row.reason,
      patientId: row.patient.id,
      patientName: row.patient.name,
      patientSpecies: row.patient.species,
      tutorName: primaryTutor
        ? `${primaryTutor.tutor.firstName} ${primaryTutor.tutor.lastName}`
        : "—",
    };
  }
}
