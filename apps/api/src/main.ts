import "./config/load-env";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { mkdirSync } from "node:fs";
import { AppModule } from "./app.module";
import { validateEnv } from "./config/env";
import {
  getProfileAvatarDirectory,
  profileAvatarPublicPath,
} from "./profile/profile-avatar.config";

async function bootstrap() {
  validateEnv(process.env);
  const avatarDirectory = getProfileAvatarDirectory();
  mkdirSync(avatarDirectory, { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(avatarDirectory, { prefix: profileAvatarPublicPath });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors();
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
