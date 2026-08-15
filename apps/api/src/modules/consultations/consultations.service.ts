import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  ConsultationDetail,
  CreateConsultationInput,
  UpdateConsultationDraftInput,
  UpdateVitalsInput,
} from "@vetclinic/contracts";
import type { Role } from "@vetclinic/db";
import { AuditService } from "../../common/audit/audit.service";
import { parseDateParts } from "../../common/clinic-time/clinic-time.util";
import { AppointmentsRepository } from "../appointments/appointments.repository";
import { PatientsRepository } from "../patients/patients.repository";
import {
  ConsultationsRepository,
  type ConsultationDetailRow,
} from "./consultations.repository";

const CREATABLE_APPOINTMENT_STATUSES = ["EN_SALA", "EN_ATENCION"];

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly consultationsRepository: ConsultationsRepository,
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly patientsRepository: PatientsRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * D1: crea la consulta en BORRADOR. Desde una cita (EN_SALA/EN_ATENCION,
   * precarga paciente+veterinario) o standalone para urgencias (paciente +
   * veterinario elegidos a mano). No toca el estado de la cita — eso es
   * RN-06, al cerrar (D3).
   */
  async create(
    input: CreateConsultationInput,
    userId: string,
    ip: string,
  ): Promise<ConsultationDetail> {
    let patientId: string;
    let vetId: string;
    let appointmentId: string | null = null;

    if (input.appointmentId) {
      const appointment = await this.appointmentsRepository.findById(input.appointmentId);
      if (!appointment) {
        throw new NotFoundException("La cita no existe.");
      }
      if (!CREATABLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
        throw new UnprocessableEntityException(
          "Solo se puede crear una consulta desde una cita en sala o en atención.",
        );
      }
      if (appointment.consultation) {
        throw new ConflictException("Esta cita ya tiene una consulta asociada.");
      }
      patientId = appointment.patientId;
      vetId = appointment.vetId;
      appointmentId = appointment.id;
    } else {
      // El refine del contrato ya exige patientId+vetId cuando no hay appointmentId.
      if (!input.patientId || !input.vetId) {
        throw new BadRequestException("Debe indicar una mascota y un veterinario.");
      }
      const patient = await this.patientsRepository.findById(input.patientId);
      if (!patient) {
        throw new NotFoundException("La mascota no existe.");
      }
      if (patient.isDeceased) {
        throw new BadRequestException(
          "No se puede crear una consulta para una mascota marcada como fallecida.",
        );
      }
      const vet = await this.appointmentsRepository.findActiveVetById(input.vetId);
      if (!vet) {
        throw new NotFoundException("El veterinario seleccionado no existe.");
      }
      patientId = patient.id;
      vetId = vet.id;
    }

    const consultation = await this.consultationsRepository.create({
      patientId,
      vetId,
      appointmentId,
      reason: input.reason.trim(),
    });

    await this.auditService.record({
      userId,
      action: "CREATE",
      entityName: "Consultation",
      entityId: consultation.id,
      ipAddress: ip,
    });

    return this.toDetailDto(consultation, false);
  }

  /** RN-18 "Ver historia clínica": AUXILIAR ve solo signos vitales. RN-07: BORRADOR solo autor/ADMIN. */
  async findById(id: string, user: { sub: string; role: Role }): Promise<ConsultationDetail> {
    const consultation = await this.consultationsRepository.findVisibleById(
      id,
      user.sub,
      user.role === "ADMIN",
    );
    if (!consultation) {
      throw new NotFoundException("La consulta no existe.");
    }
    return this.toDetailDto(consultation, user.role === "AUXILIAR");
  }

  /**
   * D2: "el rol AUXILIAR puede editar únicamente los campos de signos
   * vitales de una consulta en borrador". No usa `findVisibleById` (RN-07)
   * a propósito: AUXILIAR nunca es autor de una consulta, así que ese
   * filtro le bloquearía siempre el acceso — registrar un signo vital no
   * requiere poder ver el resto de la historia clínica.
   */
  async updateVitals(
    id: string,
    input: UpdateVitalsInput,
    user: { sub: string; role: Role },
    ip: string,
  ): Promise<ConsultationDetail> {
    const existing = await this.consultationsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("La consulta no existe.");
    }
    if (existing.status === "CERRADA") {
      throw new UnprocessableEntityException(
        "Esta consulta está cerrada y no se puede modificar.",
      );
    }

    const updated = await this.consultationsRepository.updateDraft(id, {
      ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
      ...(input.temperatureC !== undefined ? { temperatureC: input.temperatureC } : {}),
      ...(input.heartRate !== undefined ? { heartRate: input.heartRate } : {}),
      ...(input.respiratoryRate !== undefined ? { respiratoryRate: input.respiratoryRate } : {}),
      ...(input.bodyConditionScore !== undefined
        ? { bodyConditionScore: input.bodyConditionScore }
        : {}),
      ...(input.mucousMembranes !== undefined
        ? { mucousMembranes: normalize(input.mucousMembranes) }
        : {}),
      ...(input.capillaryRefill !== undefined ? { capillaryRefill: input.capillaryRefill } : {}),
    });

    if (!updated) {
      throw new ConflictException(
        "La consulta se cerró mientras se guardaba. Refresca para ver el estado actual.",
      );
    }

    await this.auditService.record({
      userId: user.sub,
      action: "UPDATE",
      entityName: "Consultation",
      entityId: id,
      ipAddress: ip,
    });

    return this.toDetailDto(updated, user.role === "AUXILIAR");
  }

  /** D1: autoguardado del borrador. RN-05: una consulta CERRADA es inmutable. */
  async updateDraft(
    id: string,
    input: UpdateConsultationDraftInput,
    user: { sub: string; role: Role },
    ip: string,
  ): Promise<ConsultationDetail> {
    const existing = await this.consultationsRepository.findVisibleById(
      id,
      user.sub,
      user.role === "ADMIN",
    );
    if (!existing) {
      throw new NotFoundException("La consulta no existe.");
    }
    if (existing.status === "CERRADA") {
      throw new UnprocessableEntityException(
        "Esta consulta está cerrada y no se puede modificar.",
      );
    }

    const updated = await this.consultationsRepository.updateDraft(id, {
      ...(input.reason !== undefined ? { reason: input.reason.trim() } : {}),
      ...(input.subjective !== undefined ? { subjective: normalize(input.subjective) } : {}),
      ...(input.objective !== undefined ? { objective: normalize(input.objective) } : {}),
      ...(input.assessment !== undefined ? { assessment: normalize(input.assessment) } : {}),
      ...(input.plan !== undefined ? { plan: normalize(input.plan) } : {}),
      ...(input.diagnosis !== undefined ? { diagnosis: normalize(input.diagnosis) } : {}),
      ...(input.treatment !== undefined ? { treatment: normalize(input.treatment) } : {}),
      ...(input.prescription !== undefined ? { prescription: normalize(input.prescription) } : {}),
      ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
      ...(input.temperatureC !== undefined ? { temperatureC: input.temperatureC } : {}),
      ...(input.heartRate !== undefined ? { heartRate: input.heartRate } : {}),
      ...(input.respiratoryRate !== undefined ? { respiratoryRate: input.respiratoryRate } : {}),
      ...(input.bodyConditionScore !== undefined
        ? { bodyConditionScore: input.bodyConditionScore }
        : {}),
      ...(input.mucousMembranes !== undefined
        ? { mucousMembranes: normalize(input.mucousMembranes) }
        : {}),
      ...(input.capillaryRefill !== undefined ? { capillaryRefill: input.capillaryRefill } : {}),
      ...(input.nextControlAt !== undefined
        ? { nextControlAt: input.nextControlAt ? dateFromParts(input.nextControlAt) : null }
        : {}),
    });

    if (!updated) {
      throw new ConflictException(
        "La consulta se cerró mientras se guardaba el borrador. Refresca para ver el estado actual.",
      );
    }

    await this.auditService.record({
      userId: user.sub,
      action: "UPDATE",
      entityName: "Consultation",
      entityId: id,
      ipAddress: ip,
    });

    return this.toDetailDto(updated, user.role === "AUXILIAR");
  }

  private async toDetailDto(
    row: ConsultationDetailRow,
    onlyVitals: boolean,
  ): Promise<ConsultationDetail> {
    const previousWeight = await this.consultationsRepository.findLatestClosedWeight(
      row.patientId,
      row.id,
    );
    return {
      id: row.id,
      patientId: row.patient.id,
      patientName: row.patient.name,
      appointmentId: row.appointmentId,
      vetId: row.vetId,
      vetName: row.vet.fullName,
      occurredAt: row.occurredAt.toISOString(),
      status: row.status,
      closedAt: row.closedAt ? row.closedAt.toISOString() : null,
      reason: onlyVitals ? null : row.reason,
      subjective: onlyVitals ? null : row.subjective,
      objective: onlyVitals ? null : row.objective,
      assessment: onlyVitals ? null : row.assessment,
      plan: onlyVitals ? null : row.plan,
      diagnosis: onlyVitals ? null : row.diagnosis,
      treatment: onlyVitals ? null : row.treatment,
      prescription: onlyVitals ? null : row.prescription,
      weightKg: row.weightKg ? row.weightKg.toNumber() : null,
      previousWeightKg: previousWeight ? previousWeight.toNumber() : null,
      temperatureC: row.temperatureC ? row.temperatureC.toNumber() : null,
      heartRate: row.heartRate,
      respiratoryRate: row.respiratoryRate,
      bodyConditionScore: row.bodyConditionScore,
      mucousMembranes: row.mucousMembranes,
      capillaryRefill: row.capillaryRefill ? row.capillaryRefill.toNumber() : null,
      nextControlAt: row.nextControlAt ? row.nextControlAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function normalize(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function dateFromParts(value: string): Date {
  const parts = parseDateParts(value);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}
