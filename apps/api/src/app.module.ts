import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AuditModule } from "./common/audit/audit.module";
import { ClinicTimeModule } from "./common/clinic-time/clinic-time.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BreedsModule } from "./modules/breeds/breeds.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { SearchModule } from "./modules/search/search.module";
import { TutorsModule } from "./modules/tutors/tutors.module";

@Module({
  imports: [
    // main.ts ya cargó el .env de la raíz del repo en process.env antes de
    // importar este módulo (ver el comentario ahí). isGlobal:true expone
    // ConfigService en toda la app sin volver a buscar el archivo.
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    PrismaModule,
    AuditModule,
    ClinicTimeModule,
    AuthModule,
    TutorsModule,
    BreedsModule,
    PatientsModule,
    SearchModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
