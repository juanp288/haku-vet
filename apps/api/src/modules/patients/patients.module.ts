import { Module } from "@nestjs/common";
import { BreedsModule } from "../breeds/breeds.module";
import { TutorsModule } from "../tutors/tutors.module";
import { PatientsController } from "./patients.controller";
import { PatientsRepository } from "./patients.repository";
import { PatientsService } from "./patients.service";

@Module({
  imports: [TutorsModule, BreedsModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsRepository],
  exports: [PatientsRepository],
})
export class PatientsModule {}
