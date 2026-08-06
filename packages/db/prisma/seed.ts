import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { canineBreeds, felineBreeds, vaccines } from "./seed-data";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} para poblar la semilla.`);
  }
  return value;
}

async function seedAdmin() {
  const email = requireEnv("SEED_ADMIN_EMAIL");
  const password = requireEnv("SEED_ADMIN_PASSWORD");
  const fullName = process.env["SEED_ADMIN_NAME"] ?? "Administrador";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName,
      role: "ADMIN",
      isActive: true,
    },
  });
}

async function seedClinicSettings() {
  await prisma.clinicSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Kahu Tienda Veterinaria",
      timezone: "America/Bogota",
      defaultAppointmentMin: 30,
      openingHour: 8,
      closingHour: 18,
      workingDays: [1, 2, 3, 4, 5, 6],
    },
  });
}

async function seedBreeds() {
  for (const name of canineBreeds) {
    await prisma.breed.upsert({
      where: { species_name: { species: "CANINO", name } },
      update: {},
      create: { name, species: "CANINO" },
    });
  }
  for (const name of felineBreeds) {
    await prisma.breed.upsert({
      where: { species_name: { species: "FELINO", name } },
      update: {},
      create: { name, species: "FELINO" },
    });
  }
}

async function seedVaccines() {
  for (const vaccine of vaccines) {
    await prisma.vaccine.upsert({
      where: { species_name: { species: vaccine.species, name: vaccine.name } },
      update: {},
      create: vaccine,
    });
  }
}

async function main() {
  await seedAdmin();
  await seedClinicSettings();
  await seedBreeds();
  await seedVaccines();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
