import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ credentials: true, origin: true });
  const port = process.env["API_PORT"] ?? 3001;
  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}`);
}

void bootstrap();
