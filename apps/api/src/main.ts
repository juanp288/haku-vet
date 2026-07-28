import { join } from "node:path";
import { config } from "dotenv";
import "reflect-metadata";

// Debe correr antes de importar AppModule: PrismaModule importa el
// singleton de @vetclinic/db, que construye PrismaClient() en cuanto el
// módulo se carga (top-level), leyendo process.env.DATABASE_URL en ese
// instante. Un `import` estático de AppModule aquí arriba se resolvería
// antes de que esta llamada se ejecute (los `require` de imports se
// izan por encima del código); por eso AppModule se importa dinámico,
// después de cargar el .env de la raíz del monorepo.
// quiet:true — sin esto dotenv imprime "tips" promocionales de terceros
// en cada arranque (irrelevante para logs de producción).
config({ path: join(__dirname, "..", "..", "..", ".env"), quiet: true });

async function bootstrap() {
  const { NestFactory } = await import("@nestjs/core");
  const { default: cookieParser } = await import("cookie-parser");
  const { AppModule } = await import("./app.module");

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({ credentials: true, origin: true });
  const port = process.env["API_PORT"] ?? 3001;
  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}`);
}

void bootstrap();
