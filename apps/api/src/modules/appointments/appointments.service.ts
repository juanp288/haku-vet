import { Injectable } from "@nestjs/common";
import type { AgendaAppointment, AgendaDay, GetAgendaQuery } from "@vetclinic/contracts";
import { ClinicTimeService } from "../../common/clinic-time/clinic-time.service";
import {
  formatDateParts,
  formatTimeInTimezone,
  getDayOfWeekUTC,
  getDayRangeInTimezone,
  parseDateParts,
} from "../../common/clinic-time/clinic-time.util";
import { AppointmentsRepository, type AppointmentRow } from "./appointments.repository";

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly clinicTimeService: ClinicTimeService,
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
