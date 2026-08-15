import { Module } from "@nestjs/common";
import { PatientsModule } from "../patients/patients.module";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsRepository } from "./appointments.repository";
import { AppointmentsService } from "./appointments.service";

@Module({
  imports: [PatientsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsRepository],
})
export class AppointmentsModule {}
