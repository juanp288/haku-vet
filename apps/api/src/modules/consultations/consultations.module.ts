import { Module } from "@nestjs/common";
import { AppointmentsModule } from "../appointments/appointments.module";
import { PatientsModule } from "../patients/patients.module";
import { ConsultationsController } from "./consultations.controller";
import { ConsultationsRepository } from "./consultations.repository";
import { ConsultationsService } from "./consultations.service";

@Module({
  imports: [AppointmentsModule, PatientsModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsRepository],
})
export class ConsultationsModule {}
