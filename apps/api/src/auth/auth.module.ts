import { Module } from "@nestjs/common";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { getRequiredEnv } from "../config/env";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { GoogleAuthService } from "./google-auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PasswordHashingService } from "./password-hashing.service";

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ??
  "7d") as JwtSignOptions["expiresIn"];

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: getRequiredEnv("JWT_SECRET"),
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    GoogleAuthService,
    JwtAuthGuard,
    PasswordHashingService,
  ],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
