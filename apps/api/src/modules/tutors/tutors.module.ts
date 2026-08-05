import { Module } from "@nestjs/common";
import { TutorsController } from "./tutors.controller";
import { TutorsRepository } from "./tutors.repository";
import { TutorsService } from "./tutors.service";

@Module({
  controllers: [TutorsController],
  providers: [TutorsService, TutorsRepository],
  exports: [TutorsRepository],
})
export class TutorsModule {}
