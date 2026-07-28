-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VETERINARIO', 'RECEPCION', 'AUXILIAR');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('CANINO', 'FELINO', 'AVE', 'ROEDOR', 'REPTIL', 'OTRO');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MACHO', 'HEMBRA', 'DESCONOCIDO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CC', 'CE', 'NIT', 'PASAPORTE', 'OTRO');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTA', 'VACUNACION', 'CONTROL', 'PROCEDIMIENTO', 'URGENCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('AGENDADA', 'CONFIRMADA', 'EN_SALA', 'EN_ATENCION', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('BORRADOR', 'CERRADA');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('VACUNA', 'CONTROL', 'CITA');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDIENTE', 'ATENDIDO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'CLOSE', 'ADDENDUM', 'DEACTIVATE', 'LOGIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "licenseNumber" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tutor" (
    "id" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'CC',
    "documentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneAlt" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "dataConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataConsentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "speciesOther" TEXT,
    "breedId" TEXT,
    "breedOther" TEXT,
    "sex" "Sex" NOT NULL DEFAULT 'DESCONOCIDO',
    "isNeutered" BOOLEAN NOT NULL DEFAULT false,
    "birthDate" TIMESTAMP(3),
    "birthDateIsApprox" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "microchip" TEXT,
    "photoPath" TEXT,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "clinicalAlert" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "deceasedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientTutor" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientTutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTA',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'AGENDADA',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "arrivedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "vetId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'BORRADOR',
    "closedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "prescription" TEXT,
    "weightKg" DECIMAL(6,2),
    "temperatureC" DECIMAL(4,1),
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "bodyConditionScore" INTEGER,
    "mucousMembranes" TEXT,
    "capillaryRefill" DECIMAL(3,1),
    "nextControlAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Addendum" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Addendum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "description" TEXT,
    "boosterIntervalDays" INTEGER,
    "initialSeriesDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccineApplication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "consultationId" TEXT,
    "vetId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "batchNumber" TEXT,
    "batchExpiresAt" TIMESTAMP(3),
    "laboratory" TEXT,
    "doseNumber" INTEGER,
    "nextDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaccineApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "patientId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "vaccineApplicationId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoPath" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "defaultAppointmentMin" INTEGER NOT NULL DEFAULT 30,
    "openingHour" INTEGER NOT NULL DEFAULT 8,
    "closingHour" INTEGER NOT NULL DEFAULT 18,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "Tutor_lastName_firstName_idx" ON "Tutor"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Tutor_phone_idx" ON "Tutor"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_documentType_documentNumber_key" ON "Tutor"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_microchip_key" ON "Patient"("microchip");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Patient_species_isActive_idx" ON "Patient"("species", "isActive");

-- CreateIndex
CREATE INDEX "PatientTutor_tutorId_idx" ON "PatientTutor"("tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientTutor_patientId_tutorId_key" ON "PatientTutor"("patientId", "tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "Breed_species_name_key" ON "Breed"("species", "name");

-- CreateIndex
CREATE INDEX "Appointment_vetId_startsAt_idx" ON "Appointment"("vetId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_status_idx" ON "Appointment"("startsAt", "status");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_appointmentId_key" ON "Consultation"("appointmentId");

-- CreateIndex
CREATE INDEX "Consultation_patientId_occurredAt_idx" ON "Consultation"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "Consultation_vetId_occurredAt_idx" ON "Consultation"("vetId", "occurredAt");

-- CreateIndex
CREATE INDEX "Addendum_consultationId_idx" ON "Addendum"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "Vaccine_species_name_key" ON "Vaccine"("species", "name");

-- CreateIndex
CREATE INDEX "VaccineApplication_patientId_appliedAt_idx" ON "VaccineApplication"("patientId", "appliedAt");

-- CreateIndex
CREATE INDEX "VaccineApplication_nextDueAt_idx" ON "VaccineApplication"("nextDueAt");

-- CreateIndex
CREATE INDEX "Reminder_status_dueAt_idx" ON "Reminder"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Reminder_patientId_idx" ON "Reminder"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_patientId_type_vaccineApplicationId_dueAt_key" ON "Reminder"("patientId", "type", "vaccineApplicationId", "dueAt");

-- CreateIndex
CREATE INDEX "Attachment_patientId_idx" ON "Attachment"("patientId");

-- CreateIndex
CREATE INDEX "Attachment_consultationId_idx" ON "Attachment"("consultationId");

-- CreateIndex
CREATE INDEX "AuditLog_entityName_entityId_idx" ON "AuditLog"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "Breed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientTutor" ADD CONSTRAINT "PatientTutor_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientTutor" ADD CONSTRAINT "PatientTutor_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addendum" ADD CONSTRAINT "Addendum_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addendum" ADD CONSTRAINT "Addendum_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineApplication" ADD CONSTRAINT "VaccineApplication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineApplication" ADD CONSTRAINT "VaccineApplication_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "Vaccine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineApplication" ADD CONSTRAINT "VaccineApplication_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineApplication" ADD CONSTRAINT "VaccineApplication_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_vaccineApplicationId_fkey" FOREIGN KEY ("vaccineApplicationId") REFERENCES "VaccineApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
